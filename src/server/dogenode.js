const dogecoin = require("node-dogecoin");
const Validator = require("jsonschema").Validator;
const {dogeNodeOptionsSchema} = require("../common/Schemas");

/**
 * Creates a connection to a dogenode (dogecoind) over localhost and
 * provides functions to run commands on the dogenode
 */
module.exports = class DogeNode {
  /**
   * Constructor to create connection object
   * @constructor
   * @param {Object} options Configuration options
   */
  constructor(options) {
    this.v = new Validator();
    const validation = this.v.validate(options, dogeNodeOptionsSchema);
    if (!validation.valid) {
      throw new Error("Invalid configuration options!");
    }

    this.dogecoin = dogecoin({
      user: options.dogeUser,
      pass: options.dogePass,
      host: options.dogeHost,
    });

    this.refreshInterval = options.refreshInterval;
  }

  /**
   * Send a command to the dogecoind instance via RPC
   * @param {String} command The RPC command to execute
   * @param {String} account The account to execute the command on
   * @return {Promise} Resolves with String repsenting the JSON output from
   * the dogecoind command. Rejects with error object on error.
   */
  handleCommand(command, account) {
    return new Promise((resolve, reject) => {
      this.dogecoin.exec(command, account, (error, result) => {
        if (error) {
          console.log(error);
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Returns a new public wallet address associated with the wallet account
   * @param {String} account The account to associate the address with
   * @return {Promise} Promise resolves with a string that represents the
   * wallet address or rejects on error
   */
  getNewAddress(account) {
    return this.handleCommand("getNewAddress", account);
  }

  /**
   * Sends a specific amount of dogecoin from the account to the public address
   * @param {String} account The account to send dogecoin out of
   * @param {String} pubAddr The public dogecoin wallet address to send coins to
   * @param {Number} amount The amount of dogecoin to send to the public address
   * @return {Promise} Resolves with string of the blockchain transaction ID or
   * rejects on error
   */
  sendFrom(account, pubAddr, amount) {
    return new Promise((resolve, reject) => {
      this.dogecoin.exec("sendFrom", account, pubAddr, amount, (err, txn) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(txn);
        }
      });
    });
  }

  /**
   * Moves an amount of dogecoin from one account on the dogecoind instance to
   * another account on the dogecoind instance.
   * @param {String} fromAcct The account to move dogecoin out of
   * @param {String} toAcct The account that receives the dogecoin
   * @param {Number} amt The amount to transfer
   * @return {Promise} Resolves on success and rejects on failure
   */
  move(fromAcct, toAcct, amt) {
    return new Promise((resolve, reject) => {
      this.dogecoin.exec("move", fromAcct, toAcct, amt, (err, result) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Fetches a specific number of records from a wallet account. The order of
   * the array is the order in which the dogenode received the transaction
   * @param {String} acct the account to fetch records for
   * @param {Integer} count number of records to fetch
   * @param {Integer} from number of records to skip over
   * @return {Promise} resolves with array of transaction IDs
   */
  queryTransactions(acct, count, from) {
    return new Promise((resolve, reject) => {
      this.dogecoin.exec("listtransactions", acct, count, from, (err, data) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
};
