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
  const GENART_MEMBERSHIP = "0x1Ca39c7F0F65B4Da24b094A9afac7aCf626B7f38";

  const GenArtInterface = await hre.ethers.getContractFactory(
    "GenArtInterfaceV3"
  );
  const genartInterface = await GenArtInterface.deploy(GENART_MEMBERSHIP);

  console.log("GenArtInterfaceV3 deployed to:", genartInterface.address);
  console.log("yarn hardhat verify --network mainnet", genartInterface.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
