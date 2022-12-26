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
 * @dev GEN.ART Flash Minter
 * Admin for collections deployed on {GenArtCurated}
 */

contract GenArtFlashMinter is GenArtMinterBase {
    address public payoutAddress;
    address public membershipLendingPool;
    uint256 public lendingFeePercentage = 0;

    mapping(address => uint256[]) public pooledMemberships;

    constructor(
        address genartInterface_,
        address genartCurated_,
        address membershipLendingPool_,
        address payoutAddress_
    ) GenArtMinterBase(genartInterface_, genartCurated_) {
        membershipLendingPool = membershipLendingPool_;
        payoutAddress = payoutAddress_;
    }

    /**
     * @dev Not need
     * Note DO NOT USE
     */
    function addPricing(address, address) external virtual override onlyAdmin {
        revert("not impelmented");
    }

    /**
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param startTime start time for minting
     * @param price price per token
     * @param mintAllocContract contract address of {GenArtMintAllocator}
     */
    function setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        address mintAllocContract
    ) external onlyAdmin {
        super._setPricing(collection, startTime, price, mintAllocContract);
        pooledMemberships[collection] = IGenArtInterface(genartInterface)
            .getMembershipsOf(membershipLendingPool);
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
        return
            (collections[collection].price * (1000 + lendingFeePercentage)) /
            1000;
    }

    /**
     * @dev Helper function to check for mint price and start date
     */
    function _checkMint(address collection) internal view {
        require(msg.value >= getPrice(collection), "wrong amount sent");

        require(
            pooledMemberships[collection].length > 0,
            "no memberships available"
        );

        require(
            collections[collection].startTime != 0,
            "falsh loan mint not started yet"
        );
        require(
            collections[collection].startTime <= block.timestamp,
            "mint not started yet"
        );
    }

    /**
     * @dev Helper function to check for available mints for sender
     */
    function _checkAvailableMints(address collection, uint256 membershipId)
        internal
        view
    {
        require(
            IGenArtInterface(genartInterface).ownerOfMembership(membershipId) ==
                membershipLendingPool,
            "not a vaulted membership"
        );

        uint256 availableMints = IGenArtMintAllocator(
            collections[collection].mintAlloc
        ).getAvailableMintsForMembership(collection, membershipId);

        require(availableMints >= 1, "no mints available");
    }

    /**
     * @dev Mint a token
     * @param collection contract address of the collection
     * @param "" any uint256
     */
    function mintOne(address collection, uint256) external payable override {
        _checkMint(collection);
        uint256 membershipId = pooledMemberships[collection][
            pooledMemberships[collection].length - 1
        ];
        pooledMemberships[collection].pop();
        _checkAvailableMints(collection, membershipId);
        _mint(collection, membershipId);
        _splitPayment(collection);
    }

    /**
     * @dev Internal function to mint tokens on {IGenArtERC721} contracts
     */
    function _mint(address collection, uint256 membershipId) internal {
        IGenArtMintAllocator(collections[collection].mintAlloc).update(
            collection,
            membershipId,
            1
        );
        IGenArtERC721(collection).mint(msg.sender, membershipId);
    }

    /**
     * @dev Only one token possible to mint
     * Note DO NOT USE
     */
    function mint(address, uint256) external payable override {
        revert("Not implemented");
    }

    /**
     * @dev Internal function to forward funds to a {GenArtPaymentSplitter}
     */
    function _splitPayment(address collection) internal {
        address paymentSplitter = GenArtCurated(genArtCurated)
            .getPaymentSplitterForCollection(collection);
        uint256 amount = (msg.value / (1000 + lendingFeePercentage)) * 1000;
        IGenArtPaymentSplitterV4(paymentSplitter).splitPayment{value: amount}();
    }

    /**
     * @dev Set the flash lending fee
     */
    function setMembershipLendingFee(uint256 lendingFeePercentage_)
        external
        onlyAdmin
    {
        lendingFeePercentage = lendingFeePercentage_;
    }

    /**
     * @dev Set membership pool address
     */
    function setMembershipLendingPool(address membershipLendingPool_)
        external
        onlyAdmin
    {
        membershipLendingPool = membershipLendingPool_;
    }

    /**
     * @dev Set the payout address for the flash lending fees
     */
    function setPayoutAddress(address payoutAddress_) external onlyGenArtAdmin {
        payoutAddress = payoutAddress_;
    }

    /**
     * @dev Widthdraw contract balance
     */
    function withdraw() external onlyAdmin {
        payable(payoutAddress).transfer(address(this).balance);
    }
}
