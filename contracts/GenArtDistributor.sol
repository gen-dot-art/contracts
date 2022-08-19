// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./GenArtAccess.sol";
import "./GenArtDutchAuctionHouse.sol";
import "./IGenArtSharing.sol";

contract GenArtDistributor is GenArtAccess {
    address public treasury;
    address public genartSharing;
    uint256 public treasuryShare = 0;
    uint256 public rewardDistributionPeriodBlocks = 260 * 24 * 30; // 30 days
    uint256 public constant DOMINATOR = 1000;

    receive() external payable {
        if (treasuryShare == 0) return;
        // send to treasury wallet or contract
        payable(treasury).transfer((msg.value * treasuryShare) / DOMINATOR);
    }

    function setTreasuryAddress(address _treasury) public onlyAdmin {
        treasury = _treasury;
    }

    function setTreasuryShare(uint256 _share) public onlyAdmin {
        treasuryShare = _share;
    }

    function setRewardDistributionPeriod(uint256 _blocks) public onlyAdmin {
        rewardDistributionPeriodBlocks = _blocks;
    }

    function distributeStaking() public {
        // send funds to staking contact and update rewards
        IGenArtSharing(genartSharing).updateRewards{
            value: address(this).balance
        }(rewardDistributionPeriodBlocks);
    }
}
