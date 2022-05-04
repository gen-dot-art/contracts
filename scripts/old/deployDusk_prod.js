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
  const NAME = "Dusk by GEN.ART";
  const SYM = "DSK";
  const URI = "https://api.gen.art/public/attributes/";
  const COLLECTION_ID = "20000";
  const MINT_SUPPLY = 225;
  const RESERVED_GOLD = 100;
  const PRICE = 0.2;
  const ARTIST = "0x15E6d255fA29b4Ce27eB760DE2bBE0F4a7078886";
  const GENART_INTERFACE = "0xF368f333FDBc6393E617EEB6ADC421b5De352cc8";
  const GENART_MEMBERSHIP = "0x1Ca39c7F0F65B4Da24b094A9afac7aCf626B7f38";
  const GenArtERC721 = await hre.ethers.getContractFactory("GenArtERC721");

  const paymentSplitter = {
    address: "0xeA5c043605c0d5952466D80673d7681980D5b751",
  };
  const args = [
    NAME,
    SYM,
    URI,
    COLLECTION_ID,
    (PRICE * 1e18).toString(),
    MINT_SUPPLY,
    RESERVED_GOLD,
    GENART_MEMBERSHIP,
    GENART_INTERFACE,
    paymentSplitter.address,
    ARTIST,
  ];
  const genartERC721 = await GenArtERC721.deploy(...args);

  await genartERC721.deployed();

  console.log("GenArtERC721 deployed to:", genartERC721.address);
  console.log(
    "yarn hardhat verify --network mainnet",
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
