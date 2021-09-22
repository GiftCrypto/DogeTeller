const chai = require("chai");
const mongoose = require("mongoose");
const sinon = require("sinon");
const fs = require("fs");
const DogeNode = require("../../src/server/model/dogenode");
const Transactions = require("../../src/server/model/transactions");

describe("Tests transaction management and lifecycle", () => {
  const dummy1 = "./test/dummy_data/txn_history_1.json";
  const dummy_data_1 = JSON.parse(fs.readFileSync(dummy1, "utf-8"));
  const dummy_data_1_accts = dummy_data_1.accounts;
  
  const dogenode = new DogeNode({
    dogeUser: "test",
    dogePass: "pass",
    dogeHost: "host",
  });

  const emptyTxnHistory = (acct) => {
    return [];
  }

  const fakeTxnHistory = (acct) => {
    return dummy_data_1.transactions.filter((txn) => txn.account === acct);
  }

  beforeEach((done) => {
    mongoose.connect("mongodb://localhost:27018/doge-teller").then(() => {
      done();
    }).catch((err) => {
      console.log("failed to connect to database!");
      console.log(err);
    });
  });

  it("fast-forwards all transactions when db is empty", async () => {
    const txn = new Transactions(dogenode, 10000, dummy_data_1_accts);
    await txn.buildIndices();

    
  });

  it("fetches entire transaction history from dogenode", async () => {
    const txn = new Transactions(dogenode, 10000, dummy_data_1_accts);
    await txn.buildIndices();

    sinon.replace(dogenode, "queryTransactions", sinon.fake(fakeTxnHistory));
    let fetched = await txn.fetchEveryTransaction();
    chai.assert.equal(fetched.length, dummy_data_1.transactions.length);

    sinon.restore();

    sinon.replace(dogenode, "queryTransactions", sinon.fake(emptyTxnHistory));
    fetched = await txn.fetchEveryTransaction();
    chai.assert.equal(fetched.length, 0);
  });
});
