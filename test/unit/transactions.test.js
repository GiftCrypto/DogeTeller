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

  const fakeSendRecvHistory = () => {
    const transactions = dummy_data_1.transactions.filter(
        (txn) => txn.category === "send" || txn.category === "receive"
    );
    return {
      transactions,
      lastblock: dummy_data_1.lastblock
    }
  }

  const fakeEmptySendRecvHistory = () => {
    return {
      transactions: [],
      lastblock: dummy_data_1.lastblock,
    }
  }

  beforeEach((done) => {
    mongoose.connect("mongodb://localhost:27018/doge-teller").then(async () => {
      await mongoose.connection.collection("sendtxns").deleteMany({})
      await mongoose.connection.collection("recvtxns").deleteMany({});
      await mongoose.connection.collection("movetxns").deleteMany({});

      sinon.restore();

      done();
    }).catch((err) => {
      console.log("failed to connect to database!");
      console.log(err);
    });
  });

  after(() => {
    mongoose.connection.collections.sendtxns.drop();
    mongoose.connection.collections.recvtxns.drop();
    mongoose.connection.collections.movetxns.drop();
  });

  it("correctly fast-forwards even with no txn history", async () => {
    const txn = new Transactions(dogenode, 10000, dummy_data_1_accts);
    await txn.buildIndices();

    const fake = sinon.fake(fakeEmptySendRecvHistory);
    sinon.replace(dogenode, "fetchAllSendRecvTransactions", fake);
    sinon.replace(dogenode, "queryTransactions", sinon.fake(emptyTxnHistory));

    const succeeded = await txn.startRefresh();
    chai.assert.isTrue(succeeded);

    const sendTxnCnt = await txn.SendTxnModel.estimatedDocumentCount().count();
    const recvTxnCnt = await txn.RecvTxnModel.estimatedDocumentCount().count();
    const moveTxnCnt = await txn.MoveTxnModel.estimatedDocumentCount().count();

    chai.assert.equal(sendTxnCnt, 0);
    chai.assert.equal(recvTxnCnt, 0);
    chai.assert.equal(moveTxnCnt, 0);
  });

  it("fast-forwards all transactions when txn history is empty", async () => {
    const txn = new Transactions(dogenode, 10000, dummy_data_1_accts);
    await txn.buildIndices();

    const fake = sinon.fake(fakeSendRecvHistory);
    sinon.replace(dogenode, "fetchAllSendRecvTransactions", fake);
    sinon.replace(dogenode, "queryTransactions", sinon.fake(fakeTxnHistory));

    const succeeded = await txn.startRefresh();
    chai.assert.isTrue(succeeded);

    // verify number of documents in DB against documents from test data
    const sendTxnCnt = await txn.SendTxnModel.estimatedDocumentCount().count();
    const expectedSendTxnCnt = dummy_data_1.transactions.filter((txn) => {
      return txn.category === "send";
    });
    const recvTxnCnt = await txn.RecvTxnModel.estimatedDocumentCount().count();
    const expectedRecvTxnCnt = dummy_data_1.transactions.filter((txn) => {
      return txn.category === "receive";
    });
    const moveTxnCnt = await txn.MoveTxnModel.estimatedDocumentCount().count();
    const expectedMoveTxnCnt = dummy_data_1.transactions.filter((txn) => {
      return txn.category === "move";
    });

    chai.assert.equal(sendTxnCnt, expectedSendTxnCnt.length);
    chai.assert.equal(recvTxnCnt, expectedRecvTxnCnt.length);
    chai.assert.equal(moveTxnCnt, expectedMoveTxnCnt.length);
  });

  it("fast-forwards correctly when db has partial txn history", async () => {
    const txn = new Transactions(dogenode, 10000, dummy_data_1_accts);
    await txn.buildIndices();

    // load up db with 10 send/recv transactions
    const txnHistory = fakeSendRecvHistory().transactions;
    for (let i = 0; i < 10; i++) {
      const currTxn = txnHistory[i];
      if (currTxn.category === "send") {
        const doc = new txn.SendTxnModel({
          account: currTxn.account === "" ? "_" : currTxn.account,
          address: currTxn.address,
          time: currTxn.time,
          amount: currTxn.amount,
          txnId: currTxn.txid,
          blockHash: currTxn.blockhash,
        });
        await doc.save();
      } else {
        const doc = new txn.RecvTxnModel({
          account: currTxn.account === "" ? "_" : currTxn.account,
          address: currTxn.address,
          time: currTxn.time,
          amount: currTxn.amount,
          txnId: currTxn.txid,
          blockHash: currTxn.blockhash,
        });
        await doc.save();
      }
    }
    const prevSendCnt = await txn.SendTxnModel.estimatedDocumentCount().count();
    const prevRecvCnt = await txn.RecvTxnModel.estimatedDocumentCount().count();

    chai.assert.equal(prevSendCnt + prevRecvCnt, 10);

    const fake = sinon.fake(fakeSendRecvHistory);
    sinon.replace(dogenode, "fetchAllSendRecvTransactions", fake);
    sinon.replace(dogenode, "queryTransactions", sinon.fake(fakeTxnHistory));

    const succeeded = await txn.startRefresh();
    chai.assert.isTrue(succeeded);

    // verify number of documents in DB against documents from test data
    const sendTxnCnt = await txn.SendTxnModel.estimatedDocumentCount().count();
    const expectedSendTxnCnt = dummy_data_1.transactions.filter((txn) => {
      return txn.category === "send";
    });
    const recvTxnCnt = await txn.RecvTxnModel.estimatedDocumentCount().count();
    const expectedRecvTxnCnt = dummy_data_1.transactions.filter((txn) => {
      return txn.category === "receive";
    });
    const moveTxnCnt = await txn.MoveTxnModel.estimatedDocumentCount().count();
    const expectedMoveTxnCnt = dummy_data_1.transactions.filter((txn) => {
      return txn.category === "move";
    });

    chai.assert.equal(sendTxnCnt, expectedSendTxnCnt.length);
    chai.assert.equal(recvTxnCnt, expectedRecvTxnCnt.length);
    chai.assert.equal(moveTxnCnt, expectedMoveTxnCnt.length);
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
