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
  const COLLECTION_ID = "20003"; // @TODO
  const COLLECTION_NAME = "Rorschach Meadow"; // @TODO
  const ARTIST_NAME = "Ash White"; // @TODO
  const PRICE = 0.15; // @TODO
  const MINT_SUPPLY = 500; // @TODO
  const SYM = "ROR"; // @TODO
  const NAME = `${COLLECTION_NAME} by ${ARTIST_NAME}`;
  const URI = "https://api.gen.art/public/attributes/";
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const GENART_INTERFACE = "0xf09473B9e7D00F505f467B344f3907a948E38Da0";
  const PAYMENT_SPLITTER_ADDRESS = "0xB42970B84C25aa3b1FD145fC41d2F301EC4BB9ad";
  const GenArtERC721 = await hre.ethers.getContractFactory("GenArtERC721AI");
  const args = [
    NAME,
    SYM,
    URI,
    COLLECTION_ID,
    (PRICE * 1e18).toString(),
    MINT_SUPPLY,
    GENART_INTERFACE,
    PAYMENT_SPLITTER_ADDRESS,
    WETH,
  ];
  const genartERCAI = await GenArtERC721.deploy(...args);

  await genartERCAI.deployed();

  console.log("GenArtERC721AI deployed to:", genartERCAI.address);
  console.log(
    "yarn hardhat verify --network mainnet",
    [genartERCAI.address]
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
