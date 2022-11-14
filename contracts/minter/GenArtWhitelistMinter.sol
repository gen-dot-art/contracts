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
 * @dev GEN.ART Whitelist Minter
 * Admin for collections deployed on {GenArtCurated}
 */

contract GenArtWhitelistMinter is IGenArtMinter, GenArtAccess {
    struct Pricing {
        uint256 startTime;
        uint256 price;
        mapping(address => bool) whitelist;
        mapping(address => bool) whitelistMinted;
    }

    address public genArtCurated;
    address public genartInterface;
    address public payoutAddress;
    uint256 public whitelistFee = 0;

    mapping(address => Pricing) public collections;

    event PricingSet(address collection, uint256 startTime, uint256 price);

    constructor(
        address genartInterface_,
        address genartCurated_,
        address payoutAddress_
    ) GenArtAccess() {
        genartInterface = genartInterface_;
        genArtCurated = genartCurated_;
        payoutAddress = payoutAddress_;
    }

    /**
     * @notice Not need
     * Note DO NOT USE
     */
    function addPricing(address, address) external override onlyAdmin {
        revert("not impelmented");
    }

    /**
     * @notice Set pricing for collection
     * @param collection contract address of the collection
     * @param startTime start time for minting
     * @param price price per token
     * @param whitelist list of whitelisted addresses
     */
    function setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        address[] memory whitelist
    ) external onlyAdmin {
        require(
            collections[collection].startTime < block.timestamp,
            "mint already started for collection"
        );
        require(startTime > block.timestamp, "startTime too early");
        collections[collection].startTime = startTime;
        collections[collection].price = price;
        for (uint256 i; i < whitelist.length; i++) {
            collections[collection].whitelist[whitelist[i]] = true;
        }
        emit PricingSet(collection, startTime, price);
    }

    /**
     * @notice Get price for collection
     * @param collection contract address of the collection
     */
    function getPrice(address collection)
        public
        view
        override
        returns (uint256)
    {
        return (collections[collection].price * (100 + whitelistFee)) / 100;
    }

    /**
     * @notice Helper function to check for mint price, start date
     * and avaialble mints for sender
     */
    function _checkMint(address collection) internal view {
        require(msg.value >= getPrice(collection), "wrong amount sent");

        bool availableMint = collections[collection].whitelist[msg.sender] &&
            !collections[collection].whitelistMinted[msg.sender];

        require(availableMint, "no mints available");

        require(
            collections[collection].startTime != 0,
            "whitelist mint not started yet"
        );
        require(
            collections[collection].startTime <= block.timestamp,
            "mint not started yet"
        );
    }

    /**
     * @notice Mint a token
     * @param collection contract address of the collection
     * @param "" any uint256
     */
    function mintOne(address collection, uint256) external payable override {
        _checkMint(collection);
        _mint(collection);
        _splitPayment(collection);
    }

    /**
     * @notice Internal function to mint tokens on {IGenArtERC721} contracts
     */
    function _mint(address collection) internal {
        collections[collection].whitelistMinted[msg.sender] = true;
        IGenArtERC721(collection).mint(msg.sender, 0);
    }

    /**
     * @notice Only one token possible to mint
     * Note DO NOT USE
     */
    function mint(address, uint256) external payable override {
        revert("Not implemented");
    }

    /**
     * @notice Internal function to forward funds to a {GenArtPaymentSplitter}
     */
    function _splitPayment(address collection) internal {
        address paymentSplitter = GenArtCurated(genArtCurated)
            .getPaymentSplitterForCollection(collection);
        uint256 amount = (msg.value / (100 + whitelistFee)) * 100;
        IGenArtPaymentSplitterV4(paymentSplitter).splitPayment{value: amount}();
    }

    /**
     * @notice Set the whitelist fee
     */
    function setWhitelistFee(uint256 whitelistFee_) external onlyAdmin {
        whitelistFee = whitelistFee_;
    }

    /**
     * @notice Set the {GenArtInferface} contract address
     */
    function setInterface(address genartInterface_) external onlyAdmin {
        genartInterface = genartInterface_;
    }

    /**
     * @notice Set the {GenArtCurated} contract address
     */
    function setCurated(address genartCurated_) external onlyAdmin {
        genArtCurated = genartCurated_;
    }

    /**
     * @notice Set the payout address for the flash lending fees
     */
    function setPayoutAddress(address payoutAddress_) external onlyGenArtAdmin {
        payoutAddress = payoutAddress_;
    }

    /**
     * @notice Get all available mints for account
     * @param collection contract address of the collection
     * @param account address of account
     */
    function getAvailableMintsForAccount(address collection, address account)
        external
        view
        override
        returns (uint256)
    {
        bool availableMint = collections[collection].whitelist[account] &&
            !collections[collection].whitelistMinted[account];
        return availableMint ? 1 : 0;
    }

    /**
     * @notice Not need
     * Note DO NOT USE
     */
    function getAvailableMintsForMembership(address, uint256)
        external
        view
        override
        returns (uint256)
    {
        return 0;
    }

    /**
     * @notice Not need
     * Note DO NOT USE
     */
    function getMembershipMints(address, uint256)
        external
        view
        override
        returns (uint256)
    {
        return 0;
    }

    /**
     * @notice Widthdraw contract balance
     */
    function withdraw() external onlyAdmin {
        payable(payoutAddress).transfer(address(this).balance);
    }

    function addWhitelist(address collection, address account)
        external
        onlyAdmin
    {
        collections[collection].whitelist[account] = true;
    }
}
