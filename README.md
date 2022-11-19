# GEN.ART Smart contracts

GEN.ART contracts support the onchain deployment of `ERC721` contract implementations to provide onchain generative art.

The central entry point for deploying contracts is the `GenArtCurated` contract.

## Design

![gen.art](design.png "GEN.ART smart contract design")

## GenArtPaymentSplitter

Allows admin to clone instances of `GenArtPaymentSplitter` which are assigned to artists.
They hold payout address and shares for royalty payouts and handle the splitting. For each artist one PaymentSplitter is deployed.

## GenArtCollectionFactory

Allows admin to clone ERC721 implementations and assign a minter to it. An arbitrary amount implementations and minters can be added to the factory and chosen from on cloning.

- `function addErc721Implementation(uint8 index, address implementation)`
- `function addMinter(uint8 index, address minter)`

## Minter

Minters are the only signers how are allowed to mint tokens on cloned ERC721 contracts. They handle permission checking, updating the mint allocation state and can provide various mint mechanics. A collection may be assigned to multiple minters.

### GenArtMinter

Contract that allows members to mint tokens by a fixed price from cloned ERC721 contracts.

### GenArtFlashMinter

Extends `GenArtMinter`. Allows members and non-members to mint tokens by a fixed price from cloned ERC721 contracts. If the minter doesn't own a GEN.ART membership the contract uses a vaulted membership (flash loan).

## GenArtCurated

Allows admin to create clone contracts via `GenArtCollectionFactory` and `GenArtPaymentSplitterFactory`.

- `createArtist(address artist, address[] memory payeesMint, address[] memory payeesRoyalties, uint256[] memory sharesMint, uint256[] memory sharesRoyalties `
- `createCollection(address artist, string memory name, string memory symbol, string memory script, uint256 maxSupply, uint8 erc721Index, uint8 minterIndex)`

## Deployed Contracts

| Name                         | mainnet                                                                                                               | goerli                                                                                                                                                               |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GenArtCurated                | [0x846bbE8EcAb2B55d75c15dcD7a3A943365a85Cf7](https://etherscan.io/address/0x846bbE8EcAb2B55d75c15dcD7a3A943365a85Cf7) | [0xB3822C6dd2c5Ce6899AdeD2827801291D1E875E7](https://goerli.etherscan.io/address/0xB3822C6dd2c5Ce6899AdeD2827801291D1E875E7)                                         |
| GenArtCollectionFactory      | [0x6DBE1a1d329f4e2cFb060e942eb11a332420Fc0e](https://etherscan.io/address/0x6DBE1a1d329f4e2cFb060e942eb11a332420Fc0e) | [0x59A34b3897f22eD5ae8b33Aeb2De5871053B34A4](https://goerli.etherscan.io/address/0x59A34b3897f22eD5ae8b33Aeb2De5871053B34A4)                                         |
| GenArtPaymentSplitterFactory | [0x353B5dB675476781Ae9b0Ea9e4f8A3CFCDf7d9FD](https://etherscan.io/address/0x353B5dB675476781Ae9b0Ea9e4f8A3CFCDf7d9FD) | [0xA8Db35B9106Adbe14321465e90856c00F8eC4b56](https://goerli.etherscan.io/address/0xA8Db35B9106Adbe14321465e90856c00F8eC4b56)                                         |
| GenArtERC721V4               | [0xe96B0eC0244aD144468902eA1daeb6297ed5b708](https://etherscan.io/address/0xe96B0eC0244aD144468902eA1daeb6297ed5b708) | [0x42cd07f6313B331Dec91fAf363f8fF0A2C5F24EB](https://goerli.etherscan.io/address/0x42cd07f6313B331Dec91fAf363f8fF0A2C5F24EB)                                         |
| GenArtPaymentSplitterV4      | [0x5D1F50E2E81e0b606DFA385B9313BD8E781aC10B](https://etherscan.io/address/0x5D1F50E2E81e0b606DFA385B9313BD8E781aC10B) | [0xCCDcFced87f8d91028B4FbbB589fb4CDC24d08Fa](https://goerli.etherscan.io/address/0xCCDcFced87f8d91028B4FbbB589fb4CDC24d08Fa)                                         |
| GenArtMintAllocator          | [0x9e2fA2e9E2C76e56736a6B21Ca94389846EA2553](https://etherscan.io/address/0x9e2fA2e9E2C76e56736a6B21Ca94389846EA2553) | [0xd9B9884E3Db4B8FCfBc7a53D80b44D114b5642ef](https://goerli.etherscan.io/address/0xd9B9884E3Db4B8FCfBc7a53D80b44D114b5642ef)                                         |
| GenArtMinter                 | [0x268dA94c29EdD4E6E82825dA94617dAE2eB6FD47](https://etherscan.io/address/0x268dA94c29EdD4E6E82825dA94617dAE2eB6FD47) | [0x66158d54F31dB3B107CA6f3e43d25E59657e29B4](https://goerli.etherscan.io/address/0x66158d54F31dB3B107CA6f3e43d25E59657e29B4)                                         |
| GenArtFlashMinter            | [0x3B34341A6fbbee1422B88e888af58D958B41c888](https://etherscan.io/address/0x3B34341A6fbbee1422B88e888af58D958B41c888) | [0xa6A58aD622f96a1ce66097f023ED9Da833C6a125](https://goerli.etherscan.io/address/0xa6A58aD622f96a1ce66097f023ED9Da833C6a125)                                         |
| GenArtWhitelistMinter        |  | [0xF63E470433FbD333c4a4BC6dB32a152C5a07f170](https://goerli.etherscan.io/address/0xF63E470433FbD333c4a4BC6dB32a152C5a07f170) |
