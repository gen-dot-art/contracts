# GEN.ART Smart contracts

GEN.ART supports the onchain deployment of ERC721 contract implementations and PaymentSplitter to handle onchain royalty forwarding to artists.

The central entry point for deploying new collections is the `GenArtCurated` contract.

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
