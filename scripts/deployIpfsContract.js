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
  const NAME = "GENART Collection v3";
  const SYM = "SYM";
  const URI = "https://test-api.gen.art/public/attributes/";
  const MINT_SUPPLY = 225;
  const RESERVED_GOLD = 100;
  const ARTIST = "0x8939a7106957dD14bf3D3aCc9151b96E4bD81bC6";
  const GENART_INTERFACE = "0x0446de57dc1ade6d5b175c0a3f0e3e8d337991e1";
  const GENART_MEMBERSHIP = "0xbAdc470F2E159f01396a546FC63D8c0Db2697f3b";
  const GenArtERC721 = await hre.ethers.getContractFactory("GenArtERC721");
  const paymentSplitter = "0x849CEf244788E4b0Ef22e11E31B6c069E04491db";
  const args = [
    NAME,
    SYM,
    URI,
    MINT_SUPPLY,
    RESERVED_GOLD,
    GENART_MEMBERSHIP,
    GENART_INTERFACE,
    paymentSplitter,
    ARTIST,
  ];
  const genartERC721 = await GenArtERC721.deploy(...args);

  await genartERC721.deployed();

  console.log("GenArtERC721 deployed to:", genartERC721.address);
  console.log(
    "yarn hardhat verify --network rinkeby",
    [genartERC721.address]
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
