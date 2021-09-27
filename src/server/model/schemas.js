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
  account: {
    type: String,
  },
  registered: {
    type: Boolean,
    default: false,
    requried: true,
  },
});

const sendTxnSchema = new Schema({
  account: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  txnId: {
    type: String,
    required: true,
    unique: true,
  },
  blockHash: {
    type: String,
    required: true,
  },
});

const recvTxnSchema = new Schema({
  account: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  txnId: {
    type: String,
    required: true,
    unique: true,
  },
  blockHash: {
    type: String,
    required: true,
  },
});

const moveTxnSchema = new Schema({
  account: {
    type: String,
    required: true,
  },
  txnHash: {
    type: String,
    required: true,
    unique: true,
  },
  otheraccount: {
    type: String,
    required: true,
  },
  time: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});

module.exports = {
  dogeNodeSchema,
  userSchema,
  sendTxnSchema,
  recvTxnSchema,
  moveTxnSchema,
};
