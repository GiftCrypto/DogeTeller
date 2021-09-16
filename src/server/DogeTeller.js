const DogeNode = require("./dogenode");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const APIKeyStrat = require("passport-headerapikey").HeaderAPIKeyStrategy;
const Validator = require("jsonschema").Validator;
const {MongoClient} = require("mongodb");
const {transferDataSchema, queryTransactions} = require("../common/Schemas");
const errorMessages = require("./errorMessages");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const mongoClient = new MongoClient(process.env.MONGO_URL);

/**
 * main function
 */
async function main() {
  const client = await mongoClient.connect();
  const mongodb = client.db("doge-teller");
  const dogeNodesCollection = mongodb.collection("doge-nodes");

  const v = new Validator();

  // setup web server
  const app = express();
  app.use(cors());
  passport.use(new APIKeyStrat(
      {header: "Authorization", prefix: "Api-Key "},
      false,
      (apikey, done) => {
        dogeNodesCollection.findOne(
            {
              "name": {$eq: process.env.DOGE_TELLER_NODE_NAME},
              "api-keys": {$in: [apikey]},
            }, (err, node) => {
              if (err) {
                done(err);
              }
              if (!node) {
                done(null, false);
              } else {
                done(null, true);
              }
            });
      }
  ));
  app.use(passport.initialize());
  // api rate limiter to prevent api abuse
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use("/api/private/", apiLimiter);
  const port = 5000;

  // setup connection to dogenode
  const dogenode = new DogeNode({
    dogeUser: process.env.DOGE_TELLER_NODE_USER,
    dogePass: process.env.DOGE_TELLER_NODE_PASS,
    dogeHost: process.env.DOGE_TELLER_NODE_HOST,
    refreshInterval: 1000,
  });
  const walletAcct = process.env.DOGE_TELLER_NODE_ACCT;

  app.get("/api/public/getNetworkFee", async function(req, res) {
    const findNodeByName = {
      "name": {$eq: process.env.DOGE_TELLER_NODE_NAME},
    };
    const node = await dogeNodesCollection.findOne(findNodeByName);
    try {
      if (!node) {
        res.status(500).json({
          err: errorMessages.DOC_NOT_FOUND,
        });
      } else {
        res.json({
          fee: node.settxfee,
        });
      }
    } catch (err) {
      res.status(500).json({
        err: errorMessages.INTERNAL_ERR,
      });
    }
  });

  app.get("/api/public/getServiceFee", async function(req, res) {
    const findNodeByName = {
      "name": {$eq: process.env.DOGE_TELLER_NODE_NAME},
    };
    const node = await dogeNodesCollection.findOne(findNodeByName);
    try {
      if (!node) {
        res.status(500).json({
          err: errorMessages.DOC_NOT_FOUND,
        });
      } else {
        res.json({
          fee: node.serviceFee,
        });
      }
    } catch (err) {
      res.status(500).json({
        err: errorMessages.INTERNAL_ERR,
      });
    }
  });

  app.get("/api/public/getNewAddress",
      rateLimit({
        windowMs: 10 * 60 * 1000,
        max: 2500,
      }),
      function(req, res) {
        dogenode.getNewAddress(walletAcct).then((address) => {
          res.json({
            address: address,
          });
        }).catch((err) => {
          res.status(500).json({
            err: err.toString(),
          });
        });
      }
  );

  app.get("/api/private/transferOut",
      passport.authenticate("headerapikey", {session: false}),
      async (req, res) => {
        // validate input supplied by the user
        const params = {
          address: req.query.address,
          amount: Number(req.query.amount),
        };
        const validation = v.validate(params, transferDataSchema);
        if (!validation.valid) {
          console.log(validation);
          res.status(500).json({
            err: errorMessages.BAD_ARGS,
          });
        } else {
          // collect service fee and transfer money out of the account
          try {
            const findNodeByName = {
              "name": {$eq: process.env.DOGE_TELLER_NODE_NAME},
            };
            const node = await dogeNodesCollection.findOne(findNodeByName);
            if (!node) {
              res.status(500).json({
                err: errorMessages.DOC_NOT_FOUND,
              });
            } else {
              const networkFee = node.settxfee;
              const serviceFee = node.serviceFee;
              const totalFee = networkFee + serviceFee;
              const fromAcct = process.env.DOGE_TELLER_NODE_ACCT;
              const amt = params.amount;
              if (amt - totalFee < 1) {
                res.status(500).json({
                  err: errorMessages.TRANSACTION_FAILED,
                });
              } else {
                try {
                  await dogenode.move(fromAcct, "fees", serviceFee);
                  const addr = params.address;
                  const amtSent = amt-totalFee;
                  const txn = await dogenode.sendFrom(fromAcct, addr, amtSent);
                  res.json({
                    txnId: txn,
                  });
                } catch (error) {
                  console.log(error.toString());
                  res.status(500).json({
                    err: errorMessages.TRANSACTION_FAILED,
                  });
                }
              }
            }
          } catch (err) {
            res.status(500).json({
              err: errorMessages.INTERNAL_ERR,
            });
          }
        }
      }
  );

  app.get("/api/private/queryTransactions",
      passport.authenticate("headerapikey", {session: false}),
      async (req, res) => {
        const params = {
          account: req.query.account,
          records: Number(req.query.records),
          skip: Number(req.query.skip),
        };
        const validation = v.validate(params, queryTransactions);
        if (!validation.valid) {
          console.log(validation);
          res.status(500).json({
            err: errorMessages.BAD_ARGS,
          });
        } else {
          const acct = params.account;
          const count = params.records;
          const from = params.skip;
          const txns = await dogenode.queryTransactions(acct, count, from);
          res.json({
            msg: txns,
          });
        }
      }
  );

  app.listen(port, () => {
    console.log(`DogeTeller server running at http://localhost:${port}`);
  });
}

process.on("exit", async () => {
  console.log("cleaning up...");
  await mongoClient.close();
});

main();
