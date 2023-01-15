// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { time } = require("@openzeppelin/test-helpers");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

async function main() {
  // Contracts are deployed using the first signer/account by default
  const [owner] = await ethers.getSigners();
  const curatedAddress = "0xd7F83BdE98FdC46AcD1036592F004b07874EDB1d";
  const mintAllocContract = "0xd9B9884E3Db4B8FCfBc7a53D80b44D114b5642ef";
  const GenArtCurated = await ethers.getContractFactory("GenArtCurated");

  const curated = GenArtCurated.attach(curatedAddress);
  const name = "GEN.ART Vaulting test";
  const symbol = "VLT";
  const erc721Index = 0;
  const paymentSplitterIndex = 0;
  const pricingMode = 1;
  const maxSupply = 5000;
  const startTime = Math.floor(Date.now() / 1000 + 60);
  const price = BigNumber.from(10).pow(8);

  const pricingData = ethers.utils.defaultAbiCoder.encode(
    [
      {
        components: [
          {
            internalType: "uint256",
            name: "startTime",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "price",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "mintAllocContract",
            type: "address",
          },
          {
            internalType: "uint8[3]",
            name: "mintAlloc",
            type: "uint8[3]",
          },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    [
      {
        artist: owner.address,
        startTime,
        price: price,
        mintAllocContract: mintAllocContract,
        mintAlloc: [1, 1, 0],
      },
    ]
  );

  const calldata = curated.interface.encodeFunctionData("createCollection", [
    {
      artist: owner.address,
      name: name,
      symbol: symbol,
      script: "test",
      collectionType: 0,
      maxSupply: maxSupply,
      erc721Index: erc721Index,
      pricingMode: pricingMode,
      pricingData: pricingData,
      paymentSplitterIndex,
      payeesMint: [owner.address],
      payeesRoyalties: [owner.address],
      sharesMint: [500],
      sharesRoyalties: [500],
    },
  ]);

  await owner.sendTransaction({
    to: curated.address,
    data: calldata,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
