const Client = require("../client/client");

const client = new Client("http://localhost:5000");

async function main () {
  try {
    const success = await client.registerUser("test@example.com", "abc123");
    console.log(`registered user: ${success}`);

    const msg = await client.login();
    console.log(msg);
  } catch (err) {
    console.error(err);
  }
}
main();
