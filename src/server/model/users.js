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
   * @param {String} address wallet address to associate with the user
   */
  async registerUser(email, password, address) {
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new this.UserModel({
      email,
      passwordHash,
      address,
    });
    await newUser.save();
  }

  /**
   * Validates that a user with the supplied credentials exists
   * @param {String} email email for the user to validate
   * @param {String} password password to chek against hash store for user
   */
  async validateUserCredentials(email, password) {
    const user = await this.UserModel.findOne({email}).exec();
    if (!user) {
      return false;
    }
    const res = await bcrypt.compare(password, user.passwordHash);
    return res;
  }
};
