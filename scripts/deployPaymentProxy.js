// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const readline = require("readline");

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const PayeeAddresses = [
    "0x0Aa31c09dCee863CffEbF4F46e1d85fdc44718b9",
    "0x7c228e74d601ee9414277a674abf9b58950e87cc",
  ];
  const PayeeShares = [250, 500];
  const argsObj = {
    PayeeAddresses,
    PayeeShares,
  };

  const args = [argsObj.PayeeAddresses, argsObj.PayeeShares];

  const strArgs = Object.keys(argsObj)
    .map((k) => `${k}: ${argsObj[k]}`)
    .join("\n");
  const ans = await askQuestion(`
Are you sure you want to deploy to MAINNET?\n${strArgs}\n
  payee 1: ${PayeeShares[0]} | ${PayeeAddresses[0]}
  payee 2: ${PayeeShares[1]} | ${PayeeAddresses[1]}
  `);

  if (ans !== "yes") {
    console.log("Aborting ...");
    return;
  }

  const GenArtPaymentProxy = await hre.ethers.getContractFactory(
    "GenArtPaymentProxy"
  );

  const genartPaymentProxy = await GenArtPaymentProxy.deploy(...args);

  await genartPaymentProxy.deployed();

  console.log(
    "yarn hardhat verify --network mainnet",
    [genartPaymentProxy.address]
      .concat(args)
      .map((a) => `"${a}"`)
      .join(" ")
  );
  console.log("GenArtPaymentProxy deployed to:", genartPaymentProxy.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
