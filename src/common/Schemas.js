const dogeNodeOptionsSchema = {
  "id": "/DogeNodeOptionsSchema",
  "type": "object",
  "properties": {
    "dogeHost": {"type": "string", "required": "tre"},
    "dogePass": {"type": "string"},
    "dogeUser": {"type": "string"},
    "refreshInterval": {"type": "Number"},
  },
  "required": ["dogeHost", "dogePass", "dogeUser", "refreshInterval"],
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

const queryTransactions = {
  "id": "/TransactionQuery",
  "type": "object",
  "properties": {
    "account": {"type": "string"},
    "records": {"type": "integer", "minimum": 1},
    "skip": {"type": "integer", "minimum": 0},
  },
  "required": ["account", "records", "skip"],
};

module.exports = {
  transferDataSchema,
  dogeNodeOptionsSchema,
  queryTransactions,
};
