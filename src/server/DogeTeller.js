const DogeNode = require("./dogenode");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const APIKeyStrat = require("passport-headerapikey").HeaderAPIKeyStrategy;
const Validator = require("jsonschema").Validator;
const {transferDataSchema} = require("../common/Schemas");
const errorMessages = require("./errorMessages");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

// setup database access
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

const v = new Validator();

// setup web server
const app = express();
app.use(cors());
passport.use(new APIKeyStrat(
    {header: "Authorization", prefix: "Api-Key "},
    false,
    (apikey, done) => {
      const query = db.collection("doge-nodes")
          .where("name", "==", process.env.DOGE_TELLER_NODE_NAME)
          .where("api-keys", "array-contains", apikey);
      query.get().then((querySnapshot) => {
        if (querySnapshot.empty) {
          done(null, false);
        } else {
          done(null, true);
        }
      }).catch((error) => {
        done(error);
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
  txnPollInterval: 1000,
});
const walletAcct = process.env.DOGE_TELLER_NODE_ACCT;

app.get("/api/public/getNetworkFee", function(req, res) {
  const query = db.collection("doge-nodes")
      .where("name", "==", process.env.DOGE_TELLER_NODE_NAME);
  query.get().then((querySnapshot) => {
    if (querySnapshot.empty) {
      res.status(500).json({
        err: errorMessages.DOC_NOT_FOUND,
      });
    } else {
      res.json({
        fee: querySnapshot.docs[0].data().settxfee,
      });
    }
  }).catch((error) => {
    console.log(error.toString());
    res.status(500).json({
      err: errorMessages.INTERNAL_ERR,
    });
  });
});

app.get("/api/public/getServiceFee", function(req, res) {
  const query = db.collection("doge-nodes")
      .where("name", "==", process.env.DOGE_TELLER_NODE_NAME);
  query.get().then((querySnapshot) => {
    if (querySnapshot.empty) {
      res.status(500).json({
        err: errorMessages.DOC_NOT_FOUND,
      });
    } else {
      res.json({
        fee: querySnapshot.docs[0].data().serviceFee,
      });
    }
  }).catch((error) => {
    console.log(error.toString());
    res.status(500).json({
      err: errorMessages.INTERNAL_ERR,
    });
  });
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
        const querySnapshot = await db.collection("doge-nodes")
            .where("name", "==", process.env.DOGE_TELLER_NODE_NAME)
            .get();
        if (querySnapshot.empty) {
          res.status(500).json({
            err: errorMessages.DOC_NOT_FOUND,
          });
        } else {
          const networkFee = querySnapshot.docs[0].data().settxfee;
          const serviceFee = querySnapshot.docs[0].data().serviceFee; // our cut
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
              const amountSent = amt-totalFee;
              const txn = await dogenode.sendFrom(fromAcct, addr, amountSent);
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
      }
    }
);

app.listen(port, () => {
  console.log(`DogeTeller server running at http://localhost:${port}`);
});
