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
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const GenArtPaymentSplitter = await hre.ethers.getContractFactory(
    "GenArtPaymentSplitterV2"
  );
  const paymentSplitter = await GenArtPaymentSplitter.deploy(WETH);

  console.log("GenArtPaymentSplitterV2 deployed to:", paymentSplitter.address);
  console.log(
    "yarn hardhat verify --network mainnet",
    paymentSplitter.address,
    WETH
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
