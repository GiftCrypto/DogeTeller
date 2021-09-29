const axios = require("axios");
const Validator = require("jsonschema").Validator;
const {registerUserSchema} = require("../common/Schemas");
const errorMessages = require("./errorMessages");

/**
 * A client library that provides functions for interacting with a DogeTeller
 * API server.
 */
module.exports = class Client {
  /**
   * Constructor to create a class that interacts with DogeTeller API
   * @param {String} host IP address of the DogeTeller server (ex 0.0.0.0:5000)
   */
  constructor(host) {
    this.instance = axios.create({
      baseURL: host,
      timeout: 3000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.v = new Validator();
  }

  /**
   * testing method
   * @param {String} email email of the user making the request
   * @param {String} password password for the user's account
   * @return {Promise} resovles with a test message
   */
  async login(email, password) {
    const res = await this.instance.post("/users/login", {
      username: email,
      password: password,
    });
    return res.data.msg;
  }

  /**
   * Registers a new user account.
   * @param {String} email email to associate with the new account
   * @param {String} password plain-text password
   */
  async registerUser(email, password) {
    /* eslint-disable */
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    /* eslint-enable */
    const validEmail = re.test(String(email).toLowerCase());
    const params = {
      email,
      password,
    };
    const validation = this.v.validate(params, registerUserSchema);
    if (!validEmail || !validation.valid) {
      throw new Error(errorMessages.BAD_ARGS);
    } else {
      try {
        const res = await this.instance.post("/users/register", params);
        return res.data.success;
      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    }
  }
};
