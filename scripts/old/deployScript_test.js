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
  const NAME = "Hypercopic by Dominikus";
  const SYM = "HYP";
  const URI = "https://test-api.gen.art/public/attributes/";
  const COLLECTION_ID = "30001";
  const STANDARD_SUPPLY = 1;
  const GOLD_SUPPLY = 1;
  const PRICE = 0.15;
  const MINT_SUPPLY = 400;
  const WETH = "0xc778417E063141139Fce010982780140Aa0cD5Ab";
  const GENART_INTERFACE = "0x6d76Fe1289323b4eD689BffAF96bd8172931c957";
  const GenArtERC721 = await hre.ethers.getContractFactory(
    "GenArtERC721Script"
  );
  const SCRIPT = "SCRIPT";
  const paymentSplitter = "0x070a294131774e1d245C08A96D05985f26dbd1c6";
  const args = [
    NAME,
    SYM,
    URI,
    SCRIPT,
    COLLECTION_ID,
    STANDARD_SUPPLY,
    GOLD_SUPPLY,
    (PRICE * 1e18).toString(),
    MINT_SUPPLY,
    [GENART_INTERFACE, paymentSplitter, WETH],
  ];
  const genartERC721 = await GenArtERC721.deploy(...args);

  await genartERC721.deployed();

  console.log("GenArtERC721Script deployed to:", genartERC721.address);
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
