const DogeTellerClient = require("../client/DogeTellerClient");

const client = new DogeTellerClient(
    "http://localhost:5000",
    "<YOUR-API-KEY-GOES-HERE>"
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
  } catch (error) {
    console.log(error);
  }
};
example();
