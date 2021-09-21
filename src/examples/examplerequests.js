const DogeTellerClient = require("../client/DogeTellerClient");
require("dotenv").config();

const client = new DogeTellerClient(
    "http://localhost:5000",
    process.env.DOGE_TELLER_API_SECRET
);

const example = async () => {
  console.log("fetching some info about the dogecoind instance:");
  try {
    const addr = await client.generateNewAddress();
    console.log("addr: " + addr);

    const networkFee = await client.getNetworkFeeAmount();
    console.log(`network fee: Ð${networkFee}`);

    const serviceFee = await client.getServiceFeeAmount();
    console.log(`service fee: Ð${serviceFee}`);

    const accountName = process.env.DOGE_TELLER_NODE_ACCT;
    const defaultAcct = await client.queryTransactions("", 100, 0);
    const acct = await client.queryTransactions(accountName, 100, 0);
    const fees = await client.queryTransactions("fees", 100, 0);
    const allTxn = defaultAcct.concat(acct).concat(fees);
    console.log(`All transactions ordered by time (${allTxn.length}):`);
    allTxn.sort((a, b) => a.time - b.time).forEach((txn) => {
      console.log(`${txn.time}: ${txn.category},${txn.account},${txn.amount}`);
    });

    // NOTE: this might fail if you try to run npm run example more than once
    // without changing the email address value. it fails because each user must
    // have a unique email address.
    const success = await client.registerUser("test@example.com", "abc123");
    console.log(`registered user?: ${success}`);
  } catch (error) {
    console.log(error);
  }
};
example();
