// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../access/GenArtAccess.sol";

/**
 * GenArt ERC721 contract factory
 */

struct CollectionParams {
    address artist;
    string name;
    string symbol;
    string script;
    uint256 maxSupply;
    uint8 erc721Index;
    uint8 minterIndex;
    address paymentSplitter;
}

contract GenArtCollectionFactory is GenArtAccess {
    mapping(uint8 => address) public minters;
    mapping(uint8 => address) public erc721Implementations;
    address public paymentSplitterImplementation;
    string public uri;
    uint256 public lastCollectionIdScript = 30002;
    uint256 public lastCollectionIdOther = 20003;
    event Created(
        uint256 id,
        address contractAddress,
        address artist,
        string name,
        string symbol,
        string script,
        uint256 maxSupply,
        address minter,
        address implementation
    );

    constructor(string memory uri_) GenArtAccess() {
        uri = uri_;
    }

    function _getNextCollectionId(bool isScript) internal returns (uint256) {
        uint256 id;
        if (isScript) {
            id = lastCollectionIdScript + 1;
            lastCollectionIdScript++;
        } else {
            id = lastCollectionIdOther + 1;
            lastCollectionIdOther++;
        }
        return id;
    }

    function _createInitializer(
        uint256 id,
        address artist,
        string memory name,
        string memory symbol,
        uint256 maxSupply,
        address minter,
        address paymentSplitter
    ) internal view returns (bytes memory) {
        return
            abi.encodeWithSignature(
                "initialize(string,string,string,uint256,uint256,address,address,address,address)",
                name,
                symbol,
                uri,
                id,
                maxSupply,
                genartAdmin,
                artist,
                minter,
                paymentSplitter
            );
    }

    function cloneCollectionContract(CollectionParams memory params)
        external
        onlyAdmin
        returns (address, uint256)
    {
        address minter = minters[params.minterIndex];
        address implementation = erc721Implementations[params.erc721Index];
        require(minter != address(0), "invalid minterIndex");
        require(implementation != address(0), "invalid erc721Index");
        uint256 id = _getNextCollectionId(bytes(params.script).length > 0);
        bytes memory initializer = _createInitializer(
            id,
            params.artist,
            params.name,
            params.symbol,
            params.maxSupply,
            minter,
            params.paymentSplitter
        );
        address instance = Clones.clone(implementation);
        Address.functionCall(instance, initializer);
        emit Created(
            id,
            instance,
            params.artist,
            params.name,
            params.symbol,
            params.script,
            params.maxSupply,
            minter,
            implementation
        );
        return (instance, id);
    }

    function addErc721Implementation(uint8 index, address implementation)
        external
        onlyAdmin
    {
        erc721Implementations[index] = implementation;
    }

    function addMinter(uint8 index, address minter) external onlyAdmin {
        minters[index] = minter;
    }

    function setUri(string memory uri_) external onlyAdmin {
        uri = uri_;
    }
}