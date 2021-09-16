const {Schema} = require("mongoose");

const dogeNodeSchema = new Schema({
  "name": String,
  "serviceFee": Number,
  "settxfee": Number,
  "api-keys": [String],
});

module.exports = {
  dogeNodeSchema,
};
