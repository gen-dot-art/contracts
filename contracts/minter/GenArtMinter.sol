// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../access/GenArtAccess.sol";
import "../app/GenArtCurated.sol";
import "../interface/IGenArtMintAllocator.sol";
import "../interface/IGenArtInterface.sol";
import "../interface/IGenArtERC721.sol";
import "../interface/IGenArtPaymentSplitterV5.sol";
import "./GenArtMinterBase.sol";

/**
 * @dev GEN.ART Default Minter
 * Admin for collections deployed on {GenArtCurated}
 */
struct FixedPriceParams {
    uint256 startTime;
    uint256 price;
    address mintAllocContract;
    uint8[3] mintAlloc;
}

contract GenArtMinter is GenArtMinterBase {
    mapping(address => uint256) public prices;

    constructor(address genartInterface_, address genartCurated_)
        GenArtMinterBase(genartInterface_, genartCurated_)
    {}

    /**
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param data encoded pricing data
     */
    function setPricing(address collection, bytes memory data)
        external
        override
        onlyAdmin
    {
        FixedPriceParams memory params = abi.decode(data, (FixedPriceParams));
        super._setMintParams(
            collection,
            params.startTime,
            params.mintAllocContract
        );
        prices[collection] = params.price;
        IGenArtMintAllocator(params.mintAllocContract).init(
            collection,
            params.mintAlloc
        );
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
            mintParams[collection].startTime != 0 &&
                mintParams[collection].startTime <= block.timestamp,
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
            mintParams[collection].mintAllocContract
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
        IGenArtMintAllocator(mintParams[collection].mintAllocContract).update(
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
            mintParams[collection].mintAllocContract
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
        uint256 value = msg.value;
        address paymentSplitter = GenArtCurated(genArtCurated)
            .store()
            .getPaymentSplitterForCollection(collection);
        IGenArtPaymentSplitterV5(paymentSplitter).splitPayment{value: value}(
            value
        );
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
        return prices[collection];
    }
}
