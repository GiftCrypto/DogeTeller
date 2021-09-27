const axios = require("axios");
const errorMessages = require("./errorMessages");
const Validator = require("jsonschema").Validator;
const {
  transferDataSchema,
  queryTransactions,
  registerUserSchema,
} = require("../common/Schemas");

/**
 * Client library that provides functions for interacting with a DogeTeller
 * API server.
 */
module.exports = class DogeTellerClient {
  /**
   * Constructor to create class that interacts with DogeTeller API
   * @param {String} host IP address of the DogeTeller server (ex 0.0.0.0:5000)
   * @param {String} apiKey API key used to authenticate with the DogeTeller
   * server.
   */
  constructor(host, apiKey) {
    this.instance = axios.create({
      baseURL: host,
      timeout: 3000,
      headers: {
        "Content-Type": "application/json",
        "authorization": `Api-Key ${apiKey}`,
      },
    });

    this.v = new Validator();
  }

  /**
   * Translates server-side error object into an error for the client.
   * @param {Object} networkError Axios error object
   * @return {Error} the new client-side error object
   */
  convertRequestError(networkError) {
    console.log("Network Error: " + networkError.message);
    if (networkError.response) {
      if (networkError.response.status === 400) {
        return new Error(errorMessages.BAD_REQ);
      } else if (networkError.response.status === 401) {
        return new Error(errorMessages.UNAUTHORIZED);
      } else if (networkError.response.status === 429) {
        return new Error(errorMessages.TOO_MANY);
      } else {
        return new Error(errorMessages.INTERNAL_ERR);
      }
    }
    return new Error(errorMessages.INTERNAL_ERR);
  }

  /**
   * Fetches the network fee amount for the dogecoind instance. The network
   * fee is part of the reward paid to validators.
   * @return {Promise} resolves with fee amount in dogecoin
   * @throws {Error} on request failure
   */
  async getNetworkFeeAmount() {
    try {
      const res = await this.instance.get("/api/public/getNetworkFee");
      return new Promise((resolve) => {
        resolve(Number(res.data.fee));
      });
    } catch (networkError) {
      throw this.convertRequestError(networkError);
    }
  }

  /**
   * Returns the service fee amount for the dogecoind instance in
   * dogecoin. The service fee is the amount paid to the organization
   * hosting the dogecoind instance.
   * @return {Promise} resolves with fee amount in dogecoin
   * @throws {Error} on request failure
   */
  async getServiceFeeAmount() {
    try {
      const res = await this.instance.get("/api/public/getServiceFee");
      return new Promise((resolve) => {
        resolve(Number(res.data.fee));
      });
    } catch (networkError) {
      throw this.convertRequestError(networkError);
    }
  }

  /**
   * Generates a new public wallet address and adds the new address to the
   * active account's address book.
   * @return {Promise} Resolves with a String for the newly generated public
   * address
   * @throws {Error} on request failure
   */
  async generateNewAddress() {
    try {
      const res = await this.instance.get("/api/public/getNewAddress");
      return new Promise((resolve) => {
        resolve(res.data.address);
      });
    } catch (networkError) {
      throw this.convertRequestError(networkError);
    }
  }

  /**
   * Sends a given amount of dogecoin (minus the network + service fee) to the
   * specified public address.
   * @param {String} addr The public address to send dogecoin to
   * @param {Number} amt The amount of dogecoin to send the the public address
   * @return {Promise} Resolves with transaction ID string
   * @throws {Error} on request failure
   */
  async transferOut(addr, amt) {
    const params = {
      address: addr,
      amount: amt,
    };
    const validation = this.v.validate(params, transferDataSchema);
    if (!validation.valid) {
      throw new Error(errorMessages.BAD_ARGS);
    }
    try {
      const res = await this.instance.get("/api/private/transferOut", {
        params: {
          address: addr,
          amount: Number(amt),
        },
      });
      return new Promise((resolve) => {
        resolve(res.data.txnId);
      });
    } catch (networkError) {
      throw this.convertRequestError(networkError);
    }
  }

  /**
   * Fetches a specific number of records from a wallet account. The order of
   * the array is the order in which the dogenode received the transaction
   *
   * For example:
   * [oldest...newest]
   * @param {String} account the account to fetch records for
   * @param {Integer} records number of records to fetch
   * @param {Integer} skip number of records to skip over
   * @return {Promise} resolves with array of transaction IDs
   * @throws {Error} on request failure
   */
  async queryTransactions(account, records, skip) {
    const params = {
      account,
      records: Number(records),
      skip: Number(skip),
    };
    const validation = this.v.validate(params, queryTransactions);
    if (!validation.valid) {
      throw new Error(errorMessages.BAD_ARGS);
    }

    try {
      const res = await this.instance("/api/private/queryTransactions", {
        params,
      });
      return new Promise((resolve) => {
        resolve(res.data.msg);
      });
    } catch (networkError) {
      throw this.convertRequestError(networkError);
    }
  }

  /**
   * Registers a new user account.
   * @param {String} email email to associate with new account
   * @param {String} password plain-text password
   */
  async registerUser(email, password) {
    /* eslint-disable */
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    /* eslint-enable */
    const validEmail = re.test(String(email).toLowerCase());
    if (!validEmail) {
      throw new Error(errorMessages.BAD_ARGS);
    }

    const params = {
      email,
      password,
    };
    const validation = this.v.validate(params, registerUserSchema);
    if (!validation.valid) {
      throw new Error(errorMessages.BAD_ARGS);
    } else {
      try {
        const res = await this.instance("/api/private/registerUser", {params});
        return new Promise((resolve) => {
          resolve(res.data.success);
        });
      } catch (networkError) {
        throw this.convertRequestError(networkError);
      }
    }
  }

  /**
   * Returns a public wallet address the user can use to fund their account with
   * @param {String} email user's email address
   * @param {String} password user's password
   */
  async getUserReceivingAddress(email, password) {
    /* eslint-disable */
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    /* eslint-enable */
    const validEmail = re.test(String(email).toLowerCase());
    if (!validEmail) {
      throw new Error(errorMessages.BAD_ARGS);
    }
    const params = {
      email,
      password,
    };
    const validation = this.v.validate(params, registerUserSchema);
    if (!validation.valid) {
      throw new Error(errorMessages.BAD_ARGS);
    } else {
      try {
        const res = await this.instance("/api/private/getReceivingAddress",
            {
              username: params.email,
              password: params.password,
            });
        return new Promise((resolve) => {
          resolve(res.data.success);
        });
      } catch (networkError) {
        throw this.convertRequestError(networkError);
      }
    }
  }
};
