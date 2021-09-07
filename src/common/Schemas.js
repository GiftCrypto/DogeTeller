const dogeNodeOptionsSchema = {
  "id": "/DogeNodeOptionsSchema",
  "type": "object",
  "properties": {
    "dogeHost": {"type": "string", "required": "tre"},
    "dogePass": {"type": "string"},
    "dogeUser": {"type": "string"},
    "txnPollInterval": {"type": "number"},
  },
  "required": ["dogeHost", "dogePass", "dogeUser", "txnPollInterval"],
};

const transferDataSchema = {
  "id": "/TransferData",
  "type": "object",
  "properties": {
    "address": {"type": "string", "minLength": 34, "maxLength": 34},
    "amount": {"type": "number", "minimum": 2.1},
  },
  "required": ["address", "amount"],
};

module.exports = {
  transferDataSchema,
  dogeNodeOptionsSchema,
};
