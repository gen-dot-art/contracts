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
  const ARTIST_NAME = "Ash White";
  const COLLECTION_NAME = "Rorschach Meadow";
  const NAME = `${COLLECTION_NAME} by ${ARTIST_NAME}`;
  const SYM = "ROR";
  const URI = "https://test-api.gen.art/public/attributes/";
  const COLLECTION_ID = "20003";
  const PRICE = 0.15;
  const MINT_SUPPLY = 5;
  const WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  const GENART_INTERFACE = "0x6d76Fe1289323b4eD689BffAF96bd8172931c957";
  const GenArtERC721 = await hre.ethers.getContractFactory("GenArtERC721AI");
  const paymentSplitter = "0x070a294131774e1d245C08A96D05985f26dbd1c6";
  const args = [
    NAME,
    SYM,
    URI,
    COLLECTION_ID,
    (PRICE * 1e18).toString(),
    MINT_SUPPLY,
    GENART_INTERFACE,
    paymentSplitter,
    WETH,
  ];
  const genartERCAI = await GenArtERC721.deploy(...args);

  await genartERCAI.deployed();

  console.log("GenArtERC721AI deployed to:", genartERCAI.address);
  console.log(
    "yarn hardhat verify --network rinkeby",
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
