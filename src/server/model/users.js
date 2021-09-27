const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const {userSchema} = require("./schemas");

/**
 * Manages the lifecycle of user accounts
 */
module.exports = class Users {
  /**
   * Constructor
   * @param {DogeNode} dogenode used to generate accounts/addresses for the user
   * @constructor
   */
  constructor(dogenode) {
    this.UserModel = mongoose.model("User", userSchema);

    this.dogenode = dogenode;
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
  async register(email, password) {
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new this.UserModel({
      email,
      passwordHash,
    });
    await newUser.save();

    // associate an account on the dogenode instance with the user account
    const account = Buffer.from(email).toString("base64");
    await this.dogenode.getNewAddress(account);
    await newUser.updateOne({
      account,
    });
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

  /**
   * Gets a public wallet address the user can use to fund the account
   * @param {UserModel} user the user to get the receiving address for.
   */
  async getReceivingAddress(user) {
    console.log(user);
  }
};
