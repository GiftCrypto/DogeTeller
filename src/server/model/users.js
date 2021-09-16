const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {userSchema} = require("./schemas");

/**
 * Manages the lifecycle of user accounts
 */
module.exports = class Users {
  /**
   * Constructor
   * @constructor
   */
  constructor() {
    this.UserModel = mongoose.model("User", userSchema);
  }

  /**
   * Builds database indices for models used in this class
   */
  async buildIndices() {
    await this.UserModel.init();
  }

  /**
   * Registers a new user account.
   * @param {String} email email to associate with new account
   * @param {String} password plain-text password
   */
  async registerUser(email, password) {
    const hash = await bcrypt.hash(password, 10);

    // TODO: generate wallet address for the user

    const newUser = new this.UserModel({
      email,
      passwordHash: hash,
      address: "address",
    });
    await newUser.save();
  }
};
