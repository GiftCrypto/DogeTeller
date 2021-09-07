const axios = require("axios");
const errorMessages = require("./errorMessages");
const Validator = require("jsonschema").Validator;
const {transferDataSchema} = require("../common/Schemas");

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
  #convertRequestError(networkError) {
    console.log("Network Error: " + networkError.message);
    if (networkError.response) {
      if (networkError.response.status === 401) {
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
      throw this.#convertRequestError(networkError);
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
      throw this.#convertRequestError(networkError);
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
      throw this.#convertRequestError(networkError);
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
      throw this.#convertRequestError(networkError);
    }
  }
};
