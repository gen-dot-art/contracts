// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  const curatedAddress = "0x846bbE8EcAb2B55d75c15dcD7a3A943365a85Cf7";

  const GenArtCurated = await ethers.getContractFactory("GenArtCurated");

  const [owner] = await ethers.getSigners();

  const curated = await GenArtCurated.attach(curatedAddress);
  const leadAddress = "0x0Aa31c09dCee863CffEbF4F46e1d85fdc44718b9";
  const stakingAddress = "0x1F7891efFD8A52f61DC1bd27D92e5d3c5Fe2d734";
  const artist = "0x4251a97d4cd5104c482000b8f8aaa6a2bd3ee0d8";
  const payeesMint = [leadAddress, artist, stakingAddress];
  const sharesMint = [175, 700, 125];
  const payeesRoyalties = [leadAddress, artist];
  const sharesRoyalties = [250, 500];
  await curated.createArtist(
    artist,
    payeesMint,
    payeesRoyalties,
    sharesMint,
    sharesRoyalties
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
