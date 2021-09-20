const mongoose = require("mongoose");
const EventEmitter = require("events");
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
   */
  startRefresh() {
    this.onRefresh();
  }

  /**
   * Invoked every $(this.refreshInterval) ms.
   */
  async onRefresh() {
    await this.update();
    setTimeout(() => {
      this.onRefresh();
    }, this.refreshInterval);
  }

  /**
   * sdfsd
   */
  async update() {
    try {
      if (this.latestSeenBlockHash === "") {
        // compare DB records and DogeNode records to fast-forward the DB
        console.log("Fast-forwarding transaction records in database...");
        const td = await this.dogenode.fetchAllTransactions();
        td.transactions.forEach((txn) => {
          console.log(txn);
        });
        if (td.transactions.length === 0) {
          // no transactions have happened yet, so just update
          // the latestSeenBlockHash
          this.latestSeenBlockHash = td.lastblock;
          console.log("Complete: 0 records fast-forwarded.");
        } else {
          // insert all missing transactions into db and update
          // the latestSeenBlockHash

          // update DB with send/recv transactions

          // update DB with move transactions

          this.latestSeenBlockHash = "what";
          console.log("Complete: 0 records fast-forwarded.");
        }
      } else {
        // fetch and save all since latest block
        const td = await this.dogenode.fetchTxnsSince(this.latestSeenBlockHash);
        console.log(td.transactions.length);
        if (td.transactions.length > 0) {
          console.log("updating db with latest transactions");
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
};
