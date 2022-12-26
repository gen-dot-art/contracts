// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../access/GenArtAccess.sol";
import "../app/GenArtCurated.sol";
import "../interface/IGenArtMinter.sol";
import "../interface/IGenArtMintAllocator.sol";
import "../interface/IGenArtInterface.sol";
import "../interface/IGenArtERC721.sol";
import "../interface/IGenArtPaymentSplitterV4.sol";
import "./GenArtMinterBase.sol";

/**
 * @dev GEN.ART Default Minter
 * Admin for collections deployed on {GenArtCurated}
 */

contract GenArtMinter is GenArtMinterBase {
    constructor(address genartInterface_, address genartCurated_)
        GenArtMinterBase(genartInterface_, genartCurated_)
    {}

    /**
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param startTime start time for minting
     * @param price price per token
     * @param mintAllocContract contract address of {GenArtMintAllocator}
     * @param mintAlloc mint allocation initalization args
     */
    function setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        address mintAllocContract,
        uint8[3] memory mintAlloc
    ) external onlyArtistOrAdmin(collection) {
        if (collections[collection].price > 0) {
            require(admins[_msgSender()], "only admin allowed");
        }
        super._setPricing(collection, startTime, price, mintAllocContract);
        IGenArtMintAllocator(mintAllocContract).init(collection, mintAlloc);
    }

    /**
     * @dev Helper function to check for mint price and start date
     */
    function _checkMint(address collection, uint256 amount) internal view {
        require(
            msg.value >= getPrice(collection) * amount,
            "wrong amount sent"
        );
        require(
            collections[collection].startTime != 0 &&
                collections[collection].startTime <= block.timestamp,
            "mint not started yet"
        );
    }

    /**
     * @dev Helper function to check for available mints for sender
     */
    function _checkAvailableMints(
        address collection,
        uint256 membershipId,
        uint256 amount
    ) internal view {
        uint256 availableMints = IGenArtMintAllocator(
            collections[collection].mintAlloc
        ).getAvailableMintsForMembership(collection, membershipId);
        require(availableMints >= amount, "no mints available");
        require(
            IGenArtInterface(genartInterface).ownerOfMembership(membershipId) ==
                msg.sender,
            "sender must be owner of membership"
        );
    }

    /**
     * @dev Mint a token
     * @param collection contract address of the collection
     * @param membershipId owned GEN.ART membershipId
     */
    function mintOne(address collection, uint256 membershipId)
        external
        payable
        override
    {
        _checkMint(collection, 1);
        _checkAvailableMints(collection, membershipId, 1);
        IGenArtMintAllocator(collections[collection].mintAlloc).update(
            collection,
            membershipId,
            1
        );
        IGenArtERC721(collection).mint(msg.sender, membershipId);
        _splitPayment(collection);
    }

    /**
     * @dev Mint a token
     * @param collection contract address of the collection
     * @param amount amount of tokens to mint
     */
    function mint(address collection, uint256 amount)
        external
        payable
        override
    {
        // get all available mints for sender
        _checkMint(collection, amount);

        // get all memberships for sender
        address minter = _msgSender();
        uint256[] memory memberships = IGenArtInterface(genartInterface)
            .getMembershipsOf(minter);
        uint256 minted;
        uint256 i;
        IGenArtMintAllocator mintAlloc = IGenArtMintAllocator(
            collections[collection].mintAlloc
        );
        // loop until the desired amount of tokens was minted
        while (minted < amount && i < memberships.length) {
            // get available mints for membership
            uint256 membershipId = memberships[i];
            uint256 mints = mintAlloc.getAvailableMintsForMembership(
                collection,
                membershipId
            );
            // mint tokens with membership and stop if desired amount reached
            uint256 j;
            for (j = 0; j < mints && minted < amount; j++) {
                IGenArtERC721(collection).mint(minter, membershipId);
                minted++;
            }
            // update mint state once membership minted tokens
            mintAlloc.update(collection, membershipId, j);
            i++;
        }
        require(minted > 0, "no mints available");
        _splitPayment(collection);
    }

    /**
     * @dev Internal function to forward funds to a {GenArtPaymentSplitter}
     */
    function _splitPayment(address collection) internal {
        address paymentSplitter = GenArtCurated(genArtCurated)
            .getPaymentSplitterForCollection(collection);
        IGenArtPaymentSplitterV4(paymentSplitter).splitPayment{
            value: msg.value
        }();
    }
}
