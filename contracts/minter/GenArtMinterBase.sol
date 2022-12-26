// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../access/GenArtAccess.sol";
import "../app/GenArtCurated.sol";
import "../interface/IGenArtMinter.sol";
import "../interface/IGenArtMintAllocator.sol";
import "../interface/IGenArtInterface.sol";
import "../interface/IGenArtERC721.sol";
import "../interface/IGenArtPaymentSplitterV4.sol";

/**
 * @dev GEN.ART Default Minter
 * Admin for collections deployed on {GenArtCurated}
 */

abstract contract GenArtMinterBase is GenArtAccess, IGenArtMinter {
    struct Pricing {
        address artist;
        uint256 startTime;
        uint256 price;
        address mintAlloc;
    }
    address public genArtCurated;
    address public genartInterface;
    mapping(address => Pricing) public collections;

    event PricingSet(
        address collection,
        uint256 startTime,
        uint256 price,
        address mintAlloc
    );

    modifier onlyArtistOrAdmin(address collection) {
        address sender = _msgSender();
        require(
            collections[collection].artist == sender || admins[sender],
            "only artist or admin allowed"
        );
        _;
    }

    constructor(address genartInterface_, address genartCurated_)
        GenArtAccess()
    {
        genartInterface = genartInterface_;
        genArtCurated = genartCurated_;
    }

    /**
     * @dev Add pricing for collection and set artist
     */
    function addPricing(address collection, address artist)
        external
        virtual
        override
        onlyAdmin
    {
        require(
            collections[collection].artist == address(0),
            "pricing already exists for collection"
        );

        collections[collection] = Pricing(artist, 0, 0, address(0));
    }

    /**
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param startTime start time for minting
     * @param price price per token
     * @param mintAllocContract contract address of {GenArtMintAllocator}
     */
    function _setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        address mintAllocContract
    ) internal {
        require(
            collections[collection].startTime < block.timestamp,
            "mint already started for collection"
        );
        require(startTime > block.timestamp, "startTime too early");
        collections[collection].startTime = startTime;
        collections[collection].price = price;
        collections[collection].mintAlloc = mintAllocContract;

        emit PricingSet(collection, startTime, price, mintAllocContract);
    }

    /**
     * @dev Get price for collection
     * @param collection contract address of the collection
     */
    function getPrice(address collection)
        public
        view
        virtual
        override
        returns (uint256)
    {
        return collections[collection].price;
    }

    /**
     * @dev Set the {GenArtInferface} contract address
     */
    function setInterface(address genartInterface_) external onlyAdmin {
        genartInterface = genartInterface_;
    }

    /**
     * @dev Set the {GenArtCurated} contract address
     */
    function setCurated(address genartCurated_) external onlyAdmin {
        genArtCurated = genartCurated_;
    }

    /**
     * @dev Get all available mints for account
     * @param collection contract address of the collection
     * @param account address of account
     */
    function getAvailableMintsForAccount(address collection, address account)
        external
        view
        virtual
        override
        returns (uint256)
    {
        return
            IGenArtMintAllocator(collections[collection].mintAlloc)
                .getAvailableMintsForAccount(collection, account);
    }

    /**
     * @dev Get available mints for a GEN.ART membership
     * @param collection contract address of the collection
     * @param membershipId owned GEN.ART membershipId
     */
    function getAvailableMintsForMembership(
        address collection,
        uint256 membershipId
    ) external view virtual override returns (uint256) {
        return
            IGenArtMintAllocator(collections[collection].mintAlloc)
                .getAvailableMintsForMembership(collection, membershipId);
    }

    /**
     * @dev Get amount of minted tokens for a GEN.ART membership
     * @param collection contract address of the collection
     * @param membershipId owned GEN.ART membershipId
     */
    function getMembershipMints(address collection, uint256 membershipId)
        external
        view
        virtual
        override
        returns (uint256)
    {
        return
            IGenArtMintAllocator(collections[collection].mintAlloc)
                .getMembershipMints(collection, membershipId);
    }

    /**
     * @dev Get collection pricing object
     * @param collection contract address of the collection
     */
    function getCollectionPricing(address collection)
        external
        view
        returns (Pricing memory)
    {
        return collections[collection];
    }
}
