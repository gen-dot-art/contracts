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

  const GENART_INTERFACE = "0x6d76Fe1289323b4eD689BffAF96bd8172931c957";
  const GENART_MEMBERSHIP = "0xbAdc470F2E159f01396a546FC63D8c0Db2697f3b";
  const GENART_TOKEN = "0xCCDcFced87f8d91028B4FbbB589fb4CDC24d08Fa";
  const GenArtSharing = await hre.ethers.getContractFactory("GenArtSharing");
  const args = [GENART_MEMBERSHIP, GENART_TOKEN, GENART_INTERFACE];
  const genartSharing = await GenArtSharing.deploy(...args);

  await genartSharing.deployed();

  console.log("GenArtSharing deployed to:", genartSharing.address);
  console.log(
    "yarn hardhat verify --network rinkeby",
    [genartSharing.address]
      .concat(args)
      .map((a) => `"${a}"`)
      .join(" ")
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
