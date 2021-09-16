const {Schema} = require("mongoose");

const dogeNodeSchema = new Schema({
  "name": {
    type: String,
    requried: true,
  },
  "serviceFee": {
    type: Number,
    requried: true,
  },
  "settxfee": {
    type: Number,
    required: true,
  },
  "api-keys": {
    type: [String],
    required: true,
  },
});

const userSchema = new Schema({
  email: {
    type: String,
    validate: {
      validator: (value) => {
        /* eslint-disable */
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        /* eslint-enable */
        return re.test(String(value).toLowerCase());
      },
      message: "Invalid email!",
    },
    unique: true,
    required: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    requried: true,
  },
  registered: {
    type: Boolean,
    default: false,
    requried: true,
  },
});

module.exports = {
  dogeNodeSchema,
  userSchema,
};
