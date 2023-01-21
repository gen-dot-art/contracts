// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../access/GenArtAccess.sol";
import "../app/GenArtCurated.sol";
import "../interface/IGenArtMintAllocator.sol";
import "../interface/IGenArtPaymentSplitterV5.sol";
import "./GenArtMinterBase.sol";

/**
 * @dev GEN.ART Whitelist Minter
 * Admin for collections deployed on {GenArtCurated}
 */

contract GenArtWhitelistMinter is GenArtMinterBase {
    struct WhitelistParams {
        uint256 startTime;
        uint256 price;
        address mintAllocContract;
        address[] whitelist;
    }
    address public payoutAddress;
    uint256 public whitelistFee = 0;
    mapping(address => uint256) public prices;
    mapping(address => mapping(address => bool)) public whitelists;

    constructor(
        address genartInterface_,
        address genartCurated_,
        address payoutAddress_
    ) GenArtMinterBase(genartInterface_, genartCurated_) {
        payoutAddress = payoutAddress_;
    }

    /**
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param data encoded pricing data
     */
    function setPricing(address collection, bytes memory data)
        external
        override
        onlyAdmin
        returns (uint256)
    {
        WhitelistParams memory params = abi.decode(data, (WhitelistParams));
        _setPricing(
            collection,
            params.startTime,
            params.price,
            params.mintAllocContract,
            params.whitelist
        );

        return params.price;
    }

    /**
     * @dev Set pricing for collection
     * @param collection contract address of the collection
     * @param startTime start time for minting
     * @param price price per token
     * @param mintAllocContract mint allocator contract address
     * @param whitelist list of whitelisted addresses
     */
    function setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        address mintAllocContract,
        address[] memory whitelist
    ) external onlyAdmin {
        _setPricing(collection, startTime, price, mintAllocContract, whitelist);
    }

    /**
     * @dev Internal helper method to set pricing for collection
     * @param collection contract address of the collection
     * @param startTime start time for minting
     * @param price price per token
     * @param mintAllocContract mint allocator contract address
     * @param whitelist list of whitelisted addresses
     */
    function _setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        address mintAllocContract,
        address[] memory whitelist
    ) internal {
        super._setMintParams(collection, startTime, mintAllocContract);
        prices[collection] = price;
        for (uint256 i; i < whitelist.length; i++) {
            whitelists[collection][whitelist[i]] = true;
        }
    }

    /**
     * @dev Get price for collection
     * @param collection contract address of the collection
     */
    function getPrice(address collection)
        public
        view
        override
        returns (uint256)
    {
        return (prices[collection] * (1000 + whitelistFee)) / 1000;
    }

    /**
     * @dev Helper function to check for mint price, start date
     * and avaialble mints for sender
     */
    function _checkMint(address collection) internal view {
        require(msg.value >= getPrice(collection), "wrong amount sent");

        bool availableMint = whitelists[collection][msg.sender];

        require(availableMint, "no mints available");

        require(
            mintParams[collection].startTime != 0,
            "whitelist mint not started yet"
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
        _mint(collection);
        _splitPayment(collection);
    }

    /**
     * @dev Internal function to mint tokens on {IGenArtERC721} contracts
     */
    function _mint(address collection) internal {
        address sender = _msgSender();
        whitelists[collection][sender] = false;

        IGenArtERC721(collection).mint(sender, 0);
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
        uint256 value = msg.value;
        address paymentSplitter = GenArtCurated(genArtCurated)
            .store()
            .getPaymentSplitterForCollection(collection);
        uint256 amount = (msg.value / (1000 + whitelistFee)) * 1000;
        IGenArtPaymentSplitterV5(paymentSplitter).splitPayment{value: amount}(
            value
        );
    }

    /**
     * @dev Set the whitelist fee
     */
    function setWhitelistFee(uint256 whitelistFee_) external onlyAdmin {
        whitelistFee = whitelistFee_;
    }

    /**
     * @dev Set the payout address for the flash lending fees
     */
    function setPayoutAddress(address payoutAddress_) external onlyGenArtAdmin {
        payoutAddress = payoutAddress_;
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
        return whitelists[collection][account] ? 1 : 0;
    }

    /**
     * @dev Not need
     * Note DO NOT USE
     */
    function getAvailableMintsForMembership(address, uint256)
        external
        pure
        override
        returns (uint256)
    {
        return 0;
    }

    /**
     * @dev Not need
     * Note DO NOT USE
     */
    function getMembershipMints(address, uint256)
        external
        view
        virtual
        override
        returns (uint256)
    {
        return 0;
    }

    function setWhitelist(
        address collection,
        address account,
        bool whitelisted
    ) external onlyAdmin {
        whitelists[collection][account] = whitelisted;
    }

    /**
     * @dev Widthdraw contract balance
     */
    function withdraw() external onlyAdmin {
        payable(payoutAddress).transfer(address(this).balance);
    }
}
