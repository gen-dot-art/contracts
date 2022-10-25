// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./access/GenArtAccess.sol";
import "./GenArtCollectionFactory.sol";
import "./GenArtPaymentSplitterFactory.sol";
import "./IGenArtERC721.sol";
import "./IGenArtMinter.sol";

/**
 * @dev GEN.ART Curated
 */
contract GenArtCurated is GenArtAccess {
    struct Collection {
        uint256 id;
        address artist;
        address contractAddress;
        uint256 maxSupply;
        string script;
    }

    struct Artist {
        address wallet;
        address[] collections;
        address paymentSplitter;
    }

    struct CollectionInfo {
        string name;
        string symbol;
        address minter;
        Collection collection;
        Artist artist;
    }

    mapping(address => Collection) public collections;
    mapping(address => Artist) public artists;

    address public collectionFactory;
    address public paymentSplitterFactory;

    constructor(address collectionFactory_, address paymentSplitterFactory_) {
        collectionFactory = collectionFactory_;
        paymentSplitterFactory = paymentSplitterFactory_;
    }

    function _cloneCollection(CollectionParams memory params)
        internal
        returns (address instance, uint256 id)
    {
        (instance, id) = GenArtCollectionFactory(collectionFactory)
            .cloneCollectionContract(params);
        collections[instance] = Collection(
            id,
            params.artist,
            instance,
            params.maxSupply,
            params.script
        );
    }

    function _createCollection(CollectionParams memory params)
        internal
        returns (address instance, uint256 id)
    {
        (instance, id) = _cloneCollection(params);
        address minter = GenArtCollectionFactory(collectionFactory).minters(
            params.minterIndex
        );
        IGenArtMinter(minter).addPricing(instance, params.artist);
    }

    function createCollection(
        address artist,
        string memory name,
        string memory symbol,
        string memory script,
        uint256 maxSupply,
        uint8 erc721Index,
        uint8 minterIndex
    ) external onlyAdmin {
        Artist storage artist_ = artists[artist];
        require(artist_.wallet != address(0), "artist does not exist");

        (address instance, ) = _createCollection(
            CollectionParams(
                artist,
                name,
                symbol,
                script,
                maxSupply,
                erc721Index,
                minterIndex,
                artists[artist].paymentSplitter
            )
        );
        artist_.collections.push(instance);
    }

    function createArtist(
        address artist,
        address[] memory payeesMint,
        address[] memory payeesRoyalties,
        uint256[] memory sharesMint,
        uint256[] memory sharesRoyalties
    ) external onlyAdmin {
        require(artists[artist].wallet == address(0), "already exists");
        address paymentSplitter = GenArtPaymentSplitterFactory(
            paymentSplitterFactory
        ).clone(
                genartAdmin,
                artist,
                payeesMint,
                payeesRoyalties,
                sharesMint,
                sharesRoyalties
            );
        address[] memory collections_;
        artists[artist] = Artist(artist, collections_, paymentSplitter);
    }

    function getPaymentSplitterForCollection(address contractAddress)
        external
        view
        returns (address)
    {
        return artists[collections[contractAddress].artist].paymentSplitter;
    }

    function getArtist(address artist) external view returns (Artist memory) {
        return artists[artist];
    }

    function getCollectionInfo(address contractAddress)
        external
        view
        returns (CollectionInfo memory info)
    {
        (
            string memory name,
            string memory symbol,
            address artist,
            address minter,
            ,
            ,

        ) = IGenArtERC721(contractAddress).getInfo();
        Artist memory artist_ = artists[artist];

        info = CollectionInfo(
            name,
            symbol,
            minter,
            collections[contractAddress],
            artist_
        );
    }

    function setCollectionFactory(address factory) public onlyAdmin {
        collectionFactory = factory;
    }

    function setPaymentSplitterFactory(address factory) public onlyAdmin {
        paymentSplitterFactory = factory;
    }
}
