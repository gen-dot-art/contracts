// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../access/GenArtAccess.sol";
import "./GenArtVault.sol";

/**
 * @dev Implements rebates and loyalties for GEN.ART members
 */
abstract contract GenArtLoyalty is GenArtAccess {
    uint256 constant DOMINATOR = 1000;
    uint256 public baseRebatePerMintBps = 125;
    uint256 public rebateWindowSec = 60 * 60 * 24 * 5; // 5 days
    uint256 public loyaltyDistributionBlocks = 260 * 24 * 14; // 14 days
    uint256 public distributionDelayBlock = 260 * 24 * 14; // 14 days
    uint256 public lastDistributionBlock;

    address public genartVault;

    constructor(address genartVault_) {
        genartVault = genartVault_;
    }

    /**
     * @dev Internal method to send funds to {GenArtVault} for distribution
     */
    function distributeLoyalties() public {
        require(
            lastDistributionBlock == 0 ||
                lastDistributionBlock + distributionDelayBlock >= block.number,
            "distribution delayed"
        );
        uint256 balance = address(this).balance;
        require(balance > 0, "zero balance");
        GenArtVault(payable(genartVault)).updateRewards{value: balance}(
            loyaltyDistributionBlocks
        );
        lastDistributionBlock = block.number;
    }

    /**
     * @dev Set the {GenArtVault} contract address
     */
    function setGenartVault(address genartVault_) external onlyAdmin {
        genartVault = genartVault_;
    }

    /**
     * @dev Set the base rebate per mint bps {e.g 125}
     */
    function setBaseRebatePerMintBps(uint256 bps) external onlyAdmin {
        baseRebatePerMintBps = bps;
    }

    /**
     * @dev Set the rebate window
     */
    function setRebateWindow(uint256 rebateWindowSec_) external onlyAdmin {
        rebateWindowSec = rebateWindowSec_;
    }

    /**
     * @dev Set the block range for loyalty distribution
     */
    function setLoyaltyDistributionBlocks(uint256 blocks) external onlyAdmin {
        loyaltyDistributionBlocks = blocks;
    }

    /**
     * @dev Set the delay loyalty distribution (in blocks)
     */
    function setDistributionDelayBlock(uint256 blocks) external onlyAdmin {
        distributionDelayBlock = blocks;
    }

    receive() external payable {
        distributeLoyalties();
    }
}
