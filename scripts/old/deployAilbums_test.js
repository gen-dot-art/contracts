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
  const NAME = "GENART Collection v5";
  const SYM = "SYM";
  const URI = "https://test-api.gen.art/public/attributes/";
  const COLLECTION_ID = "20001";
  const STANDARD_SUPPLY = 1;
  const GOLD_SUPPLY = 1;
  const PRICE = 0.2;
  const MINT_SUPPLY = 10;
  const WETH = "0x8939a7106957dD14bf3D3aCc9151b96E4bD81bC6";
  const GENART_INTERFACE = "0x6d76Fe1289323b4eD689BffAF96bd8172931c957";
  const GenArtERC721 = await hre.ethers.getContractFactory(
    "GenArtERC721Ailbums"
  );
  const paymentSplitter = "0xD1F53dC00837F32CE944B6d11323C46DCB0F03a2";
  const args = [
    NAME,
    SYM,
    URI,
    COLLECTION_ID,
    STANDARD_SUPPLY,
    GOLD_SUPPLY,
    (PRICE * 1e18).toString(),
    MINT_SUPPLY,
    GENART_INTERFACE,
    paymentSplitter,
    WETH,
  ];
  const genartERC721 = await GenArtERC721.deploy(...args);

  await genartERC721.deployed();

  console.log("GenArtERC721Ailbums deployed to:", genartERC721.address);
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
