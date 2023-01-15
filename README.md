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
| GenArtMembership               | [0x1Ca39c7F0F65B4Da24b094A9afac7aCf626B7f38](https://etherscan.io/address/0x1Ca39c7F0F65B4Da24b094A9afac7aCf626B7f38) | [0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06](https://goerli.etherscan.io/address/0x8E0414D4714fA11DC7c6F6ff80f19B2b555FcD06)                                         |
| GenArtCurated                | [0x846bbE8EcAb2B55d75c15dcD7a3A943365a85Cf7](https://etherscan.io/address/0x846bbE8EcAb2B55d75c15dcD7a3A943365a85Cf7) | [0xd7F83BdE98FdC46AcD1036592F004b07874EDB1d](https://goerli.etherscan.io/address/0xd7F83BdE98FdC46AcD1036592F004b07874EDB1d)                                         |
| GenArtCollectionFactory      | [0x6DBE1a1d329f4e2cFb060e942eb11a332420Fc0e](https://etherscan.io/address/0x6DBE1a1d329f4e2cFb060e942eb11a332420Fc0e) | [0xE6572590EAa176Ca622B1F2172BcD8f3FF58eC91](https://goerli.etherscan.io/address/0xE6572590EAa176Ca622B1F2172BcD8f3FF58eC91)                                         |
| GenArtPaymentSplitterFactory | [0x20223081512d6f32E993B7bbD101B61F36DC4e6E](https://etherscan.io/address/0x20223081512d6f32E993B7bbD101B61F36DC4e6E) | [0x92A3409bf8821DD108eF1c6fC4b18bb0abDf897F](https://goerli.etherscan.io/address/0x92A3409bf8821DD108eF1c6fC4b18bb0abDf897F)                                         |
| GenArtERC721V4               | [0xe96B0eC0244aD144468902eA1daeb6297ed5b708](https://etherscan.io/address/0xe96B0eC0244aD144468902eA1daeb6297ed5b708) | [0x42cd07f6313B331Dec91fAf363f8fF0A2C5F24EB](https://goerli.etherscan.io/address/0x42cd07f6313B331Dec91fAf363f8fF0A2C5F24EB)                                         |
| GenArtPaymentSplitterV4      | [0x5aac27784Dafc15191eAB3cdF4db91e7dF9CC830](https://etherscan.io/address/0x5aac27784Dafc15191eAB3cdF4db91e7dF9CC830) | [0xd2baebC0d616C64Ff870dE3Bb345238cb93a26Bb](https://goerli.etherscan.io/address/0xd2baebC0d616C64Ff870dE3Bb345238cb93a26Bb)                                         |
| GenArtPaymentSplitterV5      |  | [0x4B447Ae96690b50A5A0F69Ee7A5cA0416b99491f](https://goerli.etherscan.io/address/0x4B447Ae96690b50A5A0F69Ee7A5cA0416b99491f)                                         |
| GenArtMintAllocator          | [0x9e2fA2e9E2C76e56736a6B21Ca94389846EA2553](https://etherscan.io/address/0x9e2fA2e9E2C76e56736a6B21Ca94389846EA2553) | [0xd9B9884E3Db4B8FCfBc7a53D80b44D114b5642ef](https://goerli.etherscan.io/address/0xd9B9884E3Db4B8FCfBc7a53D80b44D114b5642ef)                                         |
| GenArtMinter                 | [0x268dA94c29EdD4E6E82825dA94617dAE2eB6FD47](https://etherscan.io/address/0x268dA94c29EdD4E6E82825dA94617dAE2eB6FD47) | [0x02102D9698Ba85d89Ff16A458e474832022c52cd](https://goerli.etherscan.io/address/0x02102D9698Ba85d89Ff16A458e474832022c52cd)                                         |
| GenArtFlashMinter            | [0x3B34341A6fbbee1422B88e888af58D958B41c888](https://etherscan.io/address/0x3B34341A6fbbee1422B88e888af58D958B41c888) | [0xfbd15971133288a10A9Fb48E1af72a0e953B9949](https://goerli.etherscan.io/address/0xfbd15971133288a10A9Fb48E1af72a0e953B9949)                                         |
| GenArtWhitelistMinter        |  | [0xF63E470433FbD333c4a4BC6dB32a152C5a07f170](https://goerli.etherscan.io/address/0xF63E470433FbD333c4a4BC6dB32a152C5a07f170) |
| GenArtLoyaltyMinter        |  | [0x51403ce83cDD0E3a13558459779E39a6ceea6e99](https://goerli.etherscan.io/address/0x51403ce83cDD0E3a13558459779E39a6ceea6e99) |
| GenArtInterfaceV4        |  | [0x44897375074ccd9d99f6c08e61adeab4a3910723](https://goerli.etherscan.io/address/0x44897375074ccd9d99f6c08e61adeab4a3910723) |
| GenArtGovToken        |  | [0xcee4b255a5c4644f5052f728200903a729d75084](https://goerli.etherscan.io/address/0xcee4b255a5c4644f5052f728200903a729d75084) |
| GenArtLoyaltyVault        |  | [0xa956be20b31db59f78d640d4df188600df72b069](https://goerli.etherscan.io/address/0xa956be20b31db59f78d640d4df188600df72b069) |
| GenArtStorage        |  | [0xca3500FF37B978dea8A349D05bE2261A27807796](https://goerli.etherscan.io/address/0xca3500FF37B978dea8A349D05bE2261A27807796) |
