const DogeNode = require("./model/dogenode");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const APIKeyStrat = require("passport-headerapikey").HeaderAPIKeyStrategy;
const Validator = require("jsonschema").Validator;
const mongoose = require("mongoose");
const {dogeNodeSchema} = require("./model/schemas");
const {
  transferDataSchema,
  queryTransactions,
  registerUserSchema,
} = require("../common/Schemas");
const errorMessages = require("./errorMessages");
const rateLimit = require("express-rate-limit");
const Users = require("./model/users");
require("dotenv").config();

/**
 * main function
 */
async function main() {
  // setup connection to database and register model types
  await mongoose.connect(`${process.env.MONGO_URL}/doge-teller`);
  const DogeNodeModel = mongoose.model("Node", dogeNodeSchema, "doge-nodes");

  // setup connection to dogenode
  const nodeName = process.env.DOGE_TELLER_NODE_NAME;
  const dogenode = new DogeNode({
    dogeUser: process.env.DOGE_TELLER_NODE_USER,
    dogePass: process.env.DOGE_TELLER_NODE_PASS,
    dogeHost: process.env.DOGE_TELLER_NODE_HOST,
    refreshInterval: 1000,
  });
  const walletAcct = process.env.DOGE_TELLER_NODE_ACCT;

  const v = new Validator();

  const users = new Users();
  await users.buildIndices();

  // setup web server
  const app = express();
  const port = 5000;
  app.use(cors());
  passport.use(new APIKeyStrat(
      {header: "Authorization", prefix: "Api-Key "},
      false,
      async (apikey, done) => {
        try {
          const node = await DogeNodeModel.findOne({
            "name": nodeName,
            "api-keys": {$in: [apikey]},
          });
          if (node) {
            done(null, true);
          } else {
            done(null, false);
          }
        } catch (err) {
          done(err);
        }
      }
  ));
  app.use(passport.initialize());
  // api rate limiter to prevent api abuse
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  });
  app.use("/api/private/", apiLimiter);

  app.get("/api/public/getNetworkFee", async function(req, res) {
    try {
      const node = await DogeNodeModel.findOne({"name": nodeName});
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
    try {
      const node = await DogeNodeModel.findOne({"name": nodeName});
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
            const node = await DogeNodeModel.findOne({"name": nodeName});
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

  app.get("/api/private/registerUser",
      passport.authenticate("headerapikey", {session: false}),
      async (req, res) => {
        const params = {
          email: req.query.email,
          password: req.query.password,
        };
        /* eslint-disable */
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        /* eslint-enable */
        const validEmail = re.test(String(params.email).toLowerCase());
        const validate = v.validate(params, registerUserSchema);
        if (!validate.valid || !validEmail) {
          console.log(validate);
          res.status(500).json({
            err: errorMessages.BAD_ARGS,
          });
        } else {
          try {
            await users.registerUser(params.email, params.password);
            res.json({
              success: true,
            });
          } catch (err) {
            console.log(err);
            res.status(400).json({
              err: errorMessages.BAD_REQ,
            });
          }
        }
      }
  );

  app.listen(port, () => {
    console.log(`DogeTeller server running at http://localhost:${port}`);
  });
}

process.on("exit", async () => {
  console.log("cleaning up...");
});

main();
