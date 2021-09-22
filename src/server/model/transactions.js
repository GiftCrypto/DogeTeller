const mongoose = require("mongoose");
const EventEmitter = require("events");
const crypto = require("crypto");
const {
  sendTxnSchema,
  recvTxnSchema,
  moveTxnSchema,
} = require("./schemas");

/**
 * Manages the lifecycle of transactions
 */
module.exports = class Transactions extends EventEmitter {
  /**
   * Constructor
   * @param {DogeNode} dogenode Used to gather info about the most recent
   * transactions
   * @param {Number} refreshInterval Determines how often new transactions are
   * saved to the DB
   * @param {[String]} accounts Wallet accounts to monitor
   * @constructor
   */
  constructor(dogenode, refreshInterval, accounts) {
    super();

    this.SendTxnModel = mongoose.model("SendTxn", sendTxnSchema);
    this.RecvTxnModel = mongoose.model("RecvTxn", recvTxnSchema);
    this.MoveTxnModel = mongoose.model("MoveTxn", moveTxnSchema);

    this.dogenode = dogenode;
    this.refreshInterval = refreshInterval;
    this.accounts = accounts;

    // i.e. the last transaction this dogenode was apart of OR a recent
    // block's blockhash if the dogenode has not been apart of any transactions
    this.latestSeenBlockHash = "";
  }

  /**
   * Builds database indices for models used in this class
   */
  async buildIndices() {
    await this.SendTxnModel.init();
    await this.RecvTxnModel.init();
    await this.MoveTxnModel.init();
  }

  /**
   * Invokes onRefresh for the first time
   * @return {Promise} resolves with true on successful refresh
   */
  async startRefresh() {
    return this.onRefresh();
  }

  /**
   * Invoked every $(this.refreshInterval) ms. Schedules another refresh event
   * if the previous refresh succeedded.
   * @return {Promise} resolves with true on successful refresh
   */
  async onRefresh() {
    try {
      await this.update();
      setTimeout(() => {
        this.onRefresh();
      }, this.refreshInterval);
    } catch (err) {
      console.log("Error occured during refresh:");
      console.log(err);
      return false; // refresh failed
    }
    return true; // refresh succeeded
  }

  /**
   * Updates transaction records in the database.
   */
  async update() {
    if (this.latestSeenBlockHash === "") {
      // compare DB records and DogeNode records to fast-forward the DB
      console.log("Fast-forwarding transaction records in database...");
      const td = await this.dogenode.fetchAllSendRecvTransactions();
      if (td.transactions.length === 0) {
        // no transactions have happened yet, so just update
        // the latestSeenBlockHash with the last block on the blockchain.
        this.latestSeenBlockHash = td.lastblock;
        console.log("Complete: 0 records fast-forwarded.");
      } else {
        // insert all missing transactions into db and update latestSeenBH
        const txns = await this.fetchEveryTransaction();
        console.log(`All transactions: ${txns.length}`);

        // filter each transaction by category
        const send = txns.filter((txn) => txn.category === "send");
        console.log(`send txns: ${send.length}`);
        const recv = txns.filter((txn) => txn.category === "receive");
        console.log(`recv txns: ${recv.length}`);
        const move = txns.filter((txn) => txn.category === "move");
        console.log(`move txns: ${move.length}`);

        const sendCount = await this.ffSendOrRecvTxn(send, this.SendTxnModel);
        const recvCount = await this.ffSendOrRecvTxn(recv, this.RecvTxnModel);
        const moveCount = await this.fastForwardMoveTxns(move);
        const totalFfd = sendCount + recvCount + moveCount;
        console.log(`Complete: ${totalFfd} records fast-forwarded.`);

        // update with last send/recv block hash
        this.latestSeenBlockHash = this.updateLatestBlockHash(send, recv);
        if (this.latestSeenBlockHash === "") {
          throw new Error("Latest Blockhash should not be empty after ff!");
        }

        console.log(`latest blockhash after ff: ${this.latestSeenBlockHash}`);
      }
    } else {
      // fetch and save all recv transactions since latest block
      console.log(`latest blockhash: ${this.latestSeenBlockHash}`);
    }
  }

  /**
   * Finds the most recent blockhash for all of the "send" and "recv"
   * transactions that this dogenode has been apart of. (Note "move" txns do not
   * need to be searched since they contain no blockhash)
   * @param {[Object]} send array containing info about "send" transactions
   * @param {[Object]} recv array containing info about "recv" transactions
   * @return {String} A string representing the latest blockhash
   */
  updateLatestBlockHash(send, recv) {
    let txns = send.concat(recv);
    if (txns.length > 0) {
      txns = txns.sort((a, b) => a - b);
      return txns[txns.length - 1].blockhash;
    } else {
      return "";
    }
  }

  /**
   * Updates database with move transactions if the transactions are not already
   * saved in the database
   * @param {[Object]} move array containing info about transactions with
   * category "move"
   * @return {Promise} resolves with number of "move" transactions written to
   * the DB.
   */
  async fastForwardMoveTxns(move) {
    const mapped = move.map((txn) => {
      const key = txn.time.toString() + txn.account + txn.otheraccount +
          txn.amount.toString();
      const sha256 = crypto.createHash("sha256");
      const hash = sha256.update(key).digest("base64");
      return new this.MoveTxnModel({
        account: txn.account === "" ? "_" : txn.account,
        txnHash: hash,
        otheraccount: txn.otheraccount === "" ? "_" : txn.otheraccount,
        time: txn.time,
        amount: txn.amount,
      });
    });
    let inserted = 0;
    try {
      const res = await this.MoveTxnModel.insertMany(mapped, {
        rawResult: true,
        ordered: false,
      });
      inserted += res.insertedCount;
    } catch (err) {
      if (err.code !== 11000) {
        throw new Error("Failed to write new documents");
      }
      console.log(`Duplicate docs (MoveTxn): ${err.writeErrors.length}`);
      inserted += err.insertedDocs.length;
    }
    return inserted;
  }

  /**
   * Updates database with send or recv transactions if the transactions are not
   * already saved in the database
   * @param {[Object]} txns txns containing info about transactions with
   * category "send" or "receive"
   * @param {Model} Model the mongoose model to save to
   * @return {Promise} resolves with number of "save" transactions written to
   * the DB.
   */
  async ffSendOrRecvTxn(txns, Model) {
    const mappedTxns = txns.map((txn) => {
      return new Model({
        account: txn.account === "" ? "_" : txn.account,
        address: txn.address,
        time: txn.time,
        amount: txn.amount,
        txnId: txn.txid,
        blockHash: txn.blockhash,
      });
    });
    let inserted = 0;
    try {
      const res = await Model.insertMany(mappedTxns, {
        rawResult: true,
        ordered: false,
      });
      inserted += res.insertedCount;
    } catch (err) {
      if (err.code !== 11000) {
        throw new Error("Failed to write new documents");
      }
      const modelName = Model.modelName;
      console.log(`Duplicate docs (${modelName}): ${err.writeErrors.length}`);
      inserted += err.insertedDocs.length;
    }

    return inserted;
  }

  /**
   * Fetches all transactions (move, send, recv) that the DogeNode has been
   * apart of.
   * return {Promise} returned promise resolves with an array of move, send,
   * and recv txns. OR rejects on error.
   */
  async fetchEveryTransaction() {
    let txns = [];
    for (let i = 0; i < this.accounts.length; i++) {
      const newTxns = await this.fetchEveryAcctTransaction(this.accounts[i]);
      txns = txns.concat(newTxns);
    }
    return txns;
  }

  /**
   * Fetches every transaction (move, send, recv) that the specified account has
   * been apart of.
   * @param {String} acct account to fetch all transactions for
   * @return {Promise} promise that resolves with array containing every txn for
   * the account
   */
  async fetchEveryAcctTransaction(acct) {
    let batchSize = 5;
    let found = [];
    do {
      batchSize *= 2;
      found = await this.dogenode.queryTransactions(acct, batchSize, 0);
    } while (found.length === batchSize);
    return found;
  }
};
