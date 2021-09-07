# DogeTeller (v0.1.0)

**Note: This is an EXPERIMENTAL project. Do not use this to move money if you are not 100% sure what you are doing. Use at your own risk!**

A secure, remote proxy that sits on top of dogecoind to provide useful functionality for apps that transfer dogecoin.

## Getting Started

This section will show you how to setup a DogeTeller server and how to integrate the client library into your application.
### Starting up a DogeTeller Server

*IMPORTANT: You will need an admin SDK key for Firebase! Firebase access is needed to talk to Firestore - the database DogeTeller uses to validate API keys. Please ask another developer on the team to generate Firebase credentials if you do not have permission to do so. For more info about the Firebase private key, [read this.](https://firebase.google.com/docs/admin/setup)*

**1) Prerequisites:**

- Create a `dogecoind` instance with local RPC command access and two accounts with the names `fees` and `<your-acct-name>`.
    - The first account, `fees` is used to collect the Service Fee amount. The second account is used to store and send dogecoin to public wallet addresses.
- Create a collection called `doge-nodes` in your Firestore DB with the following document entry:
```json
api-keys: ["<uniqueapikey1>", "<uniqueapikey2>", "..."]
name: "<friendly name goes here>"
serviceFee: 0.1
settxfee: 1
```
This database document will allow DogeTeller to authenticate requests and gather vital information about the dogecoind instance. If you plan to run mutliple instance of dogecoind-DogeTeller pairs, you can add a new database document for each pair. Also, make sure to keep your API keys secret!

**2) Configuring and Running DogeTeller:**

First, you will need to get the source code and build the backend:
```bash
git clone https://github.com/GiftCrypto/doge-teller.git
cd doge-teller
npm install
```

Secondly, you will need to place the following variable values into a file named `doge-teller/.env`:
```bash
GOOGLE_APPLICATION_CREDENTIALS="LOCAL RELATIVE PATH_TO_FIREBASE_PRIVATE_KEY_FILE"
DOGE_TELLER_NODE_HOST="0.0.0.0" # ip address of the dogecoind instance
DOGE_TELLER_NODE_USER="dogefather"
DOGE_TELLER_NODE_PASS="doge123"
DOGE_TELLER_NODE_ACCT="your-acct-name" # wallet account name
DOGE_TELLER_NODE_NAME="elon" # friendly name for the dogecoind instance
```

Next, if run `npm start` and you should see the following message:
```
DogeTeller server running at http://localhost:5000
```

Finally, you can test to see if you configured everything correctly by making an example API request:

```
curl --header "Authorization: Api-Key YOUR_KEY_GOES_HERE" -X GET http://localhost:5000/getNewAddress
```

### Integrating the DogeTeller Client

First, import the client library into your client. Then create a new `DogeTellerClient` instance; make sure to supply the link to your dogecoind instance and your API key. 


```javascript
const DogeTellerClient = require("../client/DogeTellerClient");

const client = new DogeTellerClient(
    "https://<YOUR_SERVICE_COM>",
    "<YOUR-API-KEY-GOES-HERE>"
);

// generate a new public address to send dogecoin to
client.generateNewAddress().then((addr) => {
    console.log("addr: " + addr); // => "addr: DPWn83nm..."
}).catch((error) => {
    console.log(error);
});

// get the transaction fee amount for the dogecoind instance
client.getFeeAmount().then((fee) => {
    console.log(`fee: Ð${fee}`); // => "fee: Ð1"
}).catch((error) => {
    console.log(error);
});

```

You can see `src/example/examplerequests.js` for more examples of what you can do with the client library.

---

## API Reference

### `/api/public/getNewAddress`
- **Method: GET**
- **Private: false**

Used to generate a new public wallet address that can be used to receive dogecoin.

Response:

```json
{
    "address": "String"
}

// example
{
    "address": "DJezNzytjEmheRMqkoGFLwx1pfbvfEs2U4"
}
```

### `/api/public/getFeeAmount`
- **Method: GET**
- **Private: false**

Fetches the network fee amount for the dogecoind instance.

Response:

```json
{
    "fee": "Number"
}

// example
{
    "fee": 1
}
```

### `/api/public/getServiceFee`
- **Method: GET**
- **Private: false**

Fetches the service fee amount for the dogecoind instance.

Response:

```json
{
    "fee": "Number"
}

// example
{
    "fee": 0.1
}
```

### `api/private/transferOut`
- **Method: GET**
- **Private: true**

Sends an amount of dogecoin to a public address minus a specific fee amount.

Payload:

```json
{
    "amount": "Number",
    "address": "String",
}
```

Response:

```json
{
    "txnId": "String",
}
```
---
