// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../access/GenArtAccess.sol";
import "../app/GenArtCurated.sol";
import "../interface/IGenArtMintAllocator.sol";
import "../interface/IGenArtInterfaceV4.sol";
import "../interface/IGenArtERC721.sol";
import "../interface/IGenArtPaymentSplitterV5.sol";
import "./GenArtMinterBase.sol";

/**
 * @dev GEN.ART Minter Flash loan
 * Admin for collections deployed on {GenArtCurated}
 */

struct FlashLoanParams {
    uint256 startTime;
    uint256 price;
    address mintAllocContract;
}

contract GenArtMinterFlash is GenArtMinterBase {
    address public payoutAddress;
    address public membershipLendingPool;
    uint256 public lendingFeePercentage = 0;

    mapping(address => uint256[]) public pooledMemberships;
    mapping(address => uint256) public prices;

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
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param data encoded data
     */
    function setPricing(address collection, bytes memory data)
        external
        override
        onlyAdmin
        returns (uint256)
    {
        FlashLoanParams memory params = abi.decode(data, (FlashLoanParams));
        _setPricing(
            collection,
            params.startTime,
            params.price,
            params.mintAllocContract
        );
        return params.price;
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
        _setPricing(collection, startTime, price, mintAllocContract);
    }

    /**
     * @dev Internal helper method to set pricing for collection
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
        super._setMintParams(collection, startTime, mintAllocContract);
        prices[collection] = price;
        pooledMemberships[collection] = IGenArtInterfaceV4(genartInterface)
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
        return (prices[collection] * (1000 + lendingFeePercentage)) / 1000;
    }

    /**
     * @dev Get available pooled memberships
     * @param collection contract address of the collection
     */
    function getPooledMemberships(address collection)
        public
        view
        virtual
        returns (uint256[] memory)
    {
        return pooledMemberships[collection];
    }

    /**
     * @dev Get available pooled memberships
     * @param collection contract address of the collection
     */
    function getTotalPooledMemberships(address collection)
        public
        view
        virtual
        returns (uint256)
    {
        return pooledMemberships[collection].length;
    }

    /**
     * @dev Helper function to check for mint price and start date
     */
    function _checkMint(address collection) internal view {
        require(msg.value == getPrice(collection), "wrong amount sent");
        (, , , , , uint256 maxSupply, uint256 totalSupply) = IGenArtERC721(
            collection
        ).getInfo();
        require(totalSupply + 1 <= maxSupply, "collection sold out");
        require(
            pooledMemberships[collection].length > 0,
            "no memberships available"
        );
        require(
            mintParams[collection].startTime != 0,
            "falsh loan mint not started yet"
        );
        require(
            mintParams[collection].startTime <= block.timestamp,
            "mint not started yet"
        );
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
        _mint(collection, membershipId);
        _splitPayment(collection);
    }

    /**
     * @dev Internal function to mint tokens on {IGenArtERC721} contracts
     */
    function _mint(address collection, uint256 membershipId) internal {
        IGenArtMintAllocator(mintParams[collection].mintAllocContract).update(
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
        revert("not implemented");
    }

    /**
     * @dev Internal function to forward funds to a {GenArtPaymentSplitter}
     */
    function _splitPayment(address collection) internal {
        uint256 value = msg.value;
        address paymentSplitter = GenArtCurated(genArtCurated)
            .store()
            .getPaymentSplitterForCollection(collection);
        uint256 amount = (value / (1000 + lendingFeePercentage)) * 1000;
        IGenArtPaymentSplitterV5(paymentSplitter).splitPayment{value: amount}(
            value
        );
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
