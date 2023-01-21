// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const genartMembershipAddress = "0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06";

  const [owner] = await ethers.getSigners();
  const GenArtLoyaltyVault = await ethers.getContractFactory(
    "GenArtLoyaltyVault"
  );
  const GenArtGovToken = await ethers.getContractFactory("GenArtGovToken");

  const GenArtInterface = await ethers.getContractFactory("GenArtInterfaceV4");

  const token = await GenArtGovToken.deploy(owner.address);

  console.log(
    "yarn hardhat verify --network goerli",
    [].concat([owner.address].map((a) => `"${a}"`)).join(" ")
  );
  await token.deployed();
  const iface = await GenArtInterface.deploy(genartMembershipAddress);
  console.log(
    "yarn hardhat verify --network goerli",
    [].concat([genartMembershipAddress].map((a) => `"${a}"`)).join(" ")
  );
  await iface.deployed();

  const vault = await GenArtLoyaltyVault.deploy(
    genartMembershipAddress,
    token.address
  );

  console.log(
    "yarn hardhat verify --network goerli",
    []
      .concat([genartMembershipAddress, token.address].map((a) => `"${a}"`))
      .join(" ")
  );
  await vault.deployed();

  // init
  await iface.setLoyaltyVault(vault.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
