// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
  const GenArtPaymentSplitter = await hre.ethers.getContractFactory(
    "GenArtPaymentSplitterV2"
  );
  const paymentSplitter = await GenArtPaymentSplitter.deploy(WETH);

  console.log("GenArtPaymentSplitterV2 deployed to:", paymentSplitter.address);
  console.log("yarn hardhat verify --network goerli", paymentSplitter.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
