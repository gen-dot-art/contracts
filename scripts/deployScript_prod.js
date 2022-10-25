// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs");
const readline = require("readline");

function byteCount(s) {
  return encodeURI(s).split(/%..|./).length - 1;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const htmlFile = "3000_script_minified.html";
  const NAME = "≈ 3000 by Santiago";
  const SYM = "3000";
  const URI = "https://api.gen.art/public/attributes/";
  const COLLECTION_ID = "30002";
  const STANDARD_SUPPLY = 1;
  const GOLD_SUPPLY = 2;
  const PRICE = 0.25;
  const MINT_SUPPLY = 100;
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const GENART_INTERFACE = "0xf09473B9e7D00F505f467B344f3907a948E38Da0";
  const SCRIPT = fs.readFileSync(`./tmp/${htmlFile}`, { encoding: "utf-8" });
  const PAYMENT_SPLITTER_ADDRESS = "0xB42970B84C25aa3b1FD145fC41d2F301EC4BB9ad";
  const argsObj = {
    NAME,
    SYM,
    URI,
    SCRIPT,
    COLLECTION_ID,
    STANDARD_SUPPLY,
    GOLD_SUPPLY,
    PRICE: (PRICE * 1e18).toString(),
    MINT_SUPPLY,
    GENART_INTERFACE,
    PAYMENT_SPLITTER_ADDRESS,
    WETH,
  };

  const args = [
    argsObj.NAME,
    argsObj.SYM,
    argsObj.URI,
    argsObj.SCRIPT,
    argsObj.COLLECTION_ID,
    argsObj.STANDARD_SUPPLY,
    argsObj.GOLD_SUPPLY,
    argsObj.PRICE,
    argsObj.MINT_SUPPLY,
    [argsObj.GENART_INTERFACE, argsObj.PAYMENT_SPLITTER_ADDRESS, argsObj.WETH],
  ];

  const strArgs = Object.keys(argsObj)
    .map((k) => `${k}: ${argsObj[k]}`)
    .join("\n");
  const ans = await askQuestion(`
Are you sure you want to deploy to MAINNET?\n${strArgs}\n
Price in ETH: ${PRICE}
Script File: ${htmlFile}
Script (KB): ${byteCount(SCRIPT) / 1000}
  `);

  if (ans !== "yes") {
    console.log("Aborting ...");
    return;
  }

  const GenArtERC721 = await hre.ethers.getContractFactory(
    "GenArtERC721Script"
  );

  const genartERC721 = await GenArtERC721.deploy(...args);

  await genartERC721.deployed();

  console.log("GenArtERC721Script deployed to:", genartERC721.address);
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
