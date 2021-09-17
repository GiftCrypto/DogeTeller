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
    const txns = await client.queryTransactions(accountName, 100, 0);
    console.log(`txns: ${txns}`);

    // NOTE: this might fail if you try to run npm run example more than once
    // without changing the email address value. it fails because each user must
    // have a unique wallet address.
    const success = await client.registerUser("test@example.com", "abc123");
    console.log(`registered user?: ${success}`);
  } catch (error) {
    console.log(error);
  }
};
example();
