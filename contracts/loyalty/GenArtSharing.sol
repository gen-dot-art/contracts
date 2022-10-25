// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./IGenArtInterface.sol";
import "../legacy/GenArtAccess.sol";

/**
 * @title GenArtSharing
 * @notice It handles the distribution of ETH revenues
 * @notice forked from https://etherscan.io/address/0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce#code
 */
contract GenArtSharing is ReentrancyGuard, GenArtAccess {
    using SafeERC20 for IERC20;
    struct UserInfo {
        uint256 tokens; // shares of token staked
        uint256[] membershipIds;
        uint256 userRewardPerTokenPaid; // user reward per token paid
        uint256 rewards; // pending rewards
    }

    // Precision factor for calculating rewards and exchange rate
    uint256 public constant PRECISION_FACTOR = 10**18;

    // Reward rate (block)
    uint256 public currentRewardPerBlock;

    // Last update block for rewards
    uint256 public lastUpdateBlock;

    // Current end block for the current reward period
    uint256 public periodEndBlock;

    // Reward per token stored
    uint256 public rewardPerTokenStored;

    // Total existing shares
    uint256 public totalTokenShares;
    uint256 public totalMembershipShares;

    mapping(address => UserInfo) public userInfo;

    IERC20 public immutable genartToken;

    address public genartInterface;

    address public genartMembership;

    uint256 public weightFactorTokens = 5;
    uint256 public weightFactorMemberships = 1;

    mapping(uint256 => address) public membershipOwners;

    event Deposit(address indexed user, uint256 amount);
    event Harvest(address indexed user, uint256 harvestedAmount);
    event NewRewardPeriod(
        uint256 numberBlocks,
        uint256 rewardPerBlock,
        uint256 reward
    );
    event Withdraw(address indexed user, uint256 amount);

    /**
     * @notice Constructor
     * @param _genartToken address of the token staked (GRNART)
     */
    constructor(
        address _genartMembership,
        address _genartToken,
        address _genartInterace
    ) {
        genartToken = IERC20(_genartToken);
        genartInterface = _genartInterace;
        genartMembership = _genartMembership;
    }

    /**
     * checks requirements for depositing a stake
     */
    function _checkDeposit(uint256[] memory membershipIds, uint256 amount)
        internal
        view
    {
        // check required amount of tokens
        require(
            amount >=
                (
                    userInfo[msg.sender].membershipIds.length == 0
                        ? 4000 * PRECISION_FACTOR
                        : 0
                ),
            "GenArtSharing: amount too small"
        );
        if (userInfo[msg.sender].membershipIds.length == 0) {
            require(
                membershipIds.length > 0,
                "GenArtSharing: minimum one GEN.ART membership required"
            );
        }
    }

    /**
     * @notice Deposit staked tokens (and collect reward tokens if requested)
     * @param amount amount to deposit (in GENART)
     */
    function deposit(uint256[] memory membershipIds, uint256 amount)
        external
        nonReentrant
    {
        _checkDeposit(membershipIds, amount);
        _deposit(membershipIds, amount);
    }

    function _deposit(uint256[] memory membershipIds, uint256 amount) internal {
        // Update reward for user
        _updateReward(msg.sender);

        // send memberships to this contract
        for (uint256 i; i < membershipIds.length; i++) {
            IERC721(genartMembership).transferFrom(
                msg.sender,
                address(this),
                membershipIds[i]
            );
            // save the membership token Ids
            userInfo[msg.sender].membershipIds.push(membershipIds[i]);
            membershipOwners[membershipIds[i]] = msg.sender;
            // adjust internal membership shares
            totalMembershipShares += _getMembershipShareValue(membershipIds[i]);
        }

        // Transfer GENART tokens to this address
        genartToken.transferFrom(msg.sender, address(this), amount);

        // Adjust internal token shares
        userInfo[msg.sender].tokens += amount;
        totalTokenShares += amount;

        emit Deposit(msg.sender, amount);
    }

    function harvest() external nonReentrant {
        // // If pending rewards are null, revert
        uint256 pendingRewards = _harvest();
        require(pendingRewards > 0, "GenArtSharing: zero rewards to harvest");
        // Transfer reward token to sender
        payable(msg.sender).transfer(pendingRewards);
    }

    /**
     * @notice Harvest reward tokens that are pending
     */
    function _harvest() internal returns (uint256) {
        // Update reward for user
        _updateReward(msg.sender);

        // Retrieve pending rewards
        uint256 pendingRewards = userInfo[msg.sender].rewards;

        if (pendingRewards == 0) return 0;
        // Adjust user rewards and transfer
        userInfo[msg.sender].rewards = 0;

        emit Harvest(msg.sender, pendingRewards);

        return pendingRewards;
    }

    /**
     * @notice Withdraw all staked tokens (and collect reward tokens if requested)
     */
    function withdraw() external nonReentrant {
        require(userInfo[msg.sender].tokens > 0, "GenArtSharing: zero shares");
        _withdraw();
    }

    /**
     * @notice Update the reward per block (in rewardToken)
     * @dev Only callable by owner. Owner is meant to be another smart contract.
     */
    function updateRewards(uint256 rewardDurationInBlocks)
        external
        payable
        onlyAdmin
    {
        // Adjust the current reward per block
        if (block.number >= periodEndBlock) {
            currentRewardPerBlock = msg.value / rewardDurationInBlocks;
        } else {
            currentRewardPerBlock =
                (msg.value +
                    ((periodEndBlock - block.number) * currentRewardPerBlock)) /
                rewardDurationInBlocks;
        }

        lastUpdateBlock = block.number;
        periodEndBlock = block.number + rewardDurationInBlocks;

        emit NewRewardPeriod(
            rewardDurationInBlocks,
            currentRewardPerBlock,
            msg.value
        );
    }

    /**
     * @notice Calculate pending rewards (WETH) for a user
     * @param user address of the user
     */
    function calculatePendingRewards(address user)
        external
        view
        returns (uint256)
    {
        return _calculatePendingRewards(user);
    }

    /**
     * @notice Return last block where trading rewards were distributed
     */
    function lastRewardBlock() external view returns (uint256) {
        return _lastRewardBlock();
    }

    /**
     * @notice Return rewards per share
     */
    function rewardPerShare() external view returns (uint256) {
        return _rewardPerShare();
    }

    /**
     * @notice Calculate pending rewards for a user
     * @param user address of the user
     */
    function _calculatePendingRewards(address user)
        internal
        view
        returns (uint256)
    {
        return
            (((getUserSharesAbs(user)) *
                (_rewardPerShare() - (userInfo[user].userRewardPerTokenPaid))) /
                PRECISION_FACTOR) + userInfo[user].rewards;
    }

    /**
     * @notice Return absolute total shares
     */
    function getTotalSharesAbs() public view returns (uint256) {
        return
            (weightFactorTokens * totalTokenShares) +
            (weightFactorMemberships * totalMembershipShares);
    }

    /**
     * @notice Return weighted shares of user
     */
    function getUserSharesAbs(address user) public view returns (uint256) {
        uint256 userMembershipShares;
        for (uint256 i = 0; i < userInfo[user].membershipIds.length; i++) {
            userMembershipShares += _getMembershipShareValue(
                userInfo[user].membershipIds[i]
            );
        }

        unchecked {
            return (weightFactorTokens *
                userInfo[user].tokens +
                weightFactorMemberships *
                userMembershipShares);
        }
    }

    /**
     * @notice Return share value of a membership based on tier
     */
    function _getMembershipShareValue(uint256 membershipId)
        internal
        view
        returns (uint256)
    {
        // 5 shares per gold membership. 1 share for standard memberships
        return
            (
                IGenArtInterface(genartInterface).isGoldToken(membershipId)
                    ? 5
                    : 1
            ) * PRECISION_FACTOR;
    }

    /**
     * @notice Return last block where rewards must be distributed
     */
    function _lastRewardBlock() internal view returns (uint256) {
        return block.number < periodEndBlock ? block.number : periodEndBlock;
    }

    /**
     * @notice Return reward per share
     */
    function _rewardPerShare() internal view returns (uint256) {
        uint256 totalShares = getTotalSharesAbs();
        if (totalShares == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            ((_lastRewardBlock() - lastUpdateBlock) *
                (currentRewardPerBlock * PRECISION_FACTOR)) /
            totalShares;
    }

    /**
     * @notice Update reward for a user account
     * @param _user address of the user
     */
    function _updateReward(address _user) internal {
        if (block.number != lastUpdateBlock) {
            rewardPerTokenStored = _rewardPerShare();
            lastUpdateBlock = _lastRewardBlock();
        }

        userInfo[_user].rewards = _calculatePendingRewards(_user);
        userInfo[_user].userRewardPerTokenPaid = rewardPerTokenStored;
    }

    /**
     * @notice Withdraw staked tokens and memberships and collect rewards
     */
    function _withdraw() internal {
        // harvest rewards
        uint256 pendingRewards = _harvest();

        uint256 tokens = userInfo[msg.sender].tokens;
        uint256[] memory memberships = userInfo[msg.sender].membershipIds;

        // adjust internal token shares
        userInfo[msg.sender].tokens = 0;
        totalTokenShares -= tokens;

        // Transfer GENART tokens to sender
        genartToken.safeTransfer(msg.sender, tokens);
        for (uint256 i = memberships.length; i >= 1; i--) {
            // remove membership token id from user info object
            userInfo[msg.sender].membershipIds.pop();
            membershipOwners[memberships[i - 1]] = address(0);
            // adjust internal membership shares
            totalMembershipShares -= _getMembershipShareValue(
                memberships[i - 1]
            );
            IERC721(genartMembership).transferFrom(
                address(this),
                msg.sender,
                memberships[i - 1]
            );
        }
        // Transfer reward token to sender
        payable(msg.sender).transfer(pendingRewards);
        emit Withdraw(msg.sender, tokens);
    }

    function setWeightFactors(
        uint256 newWeightFactorTokens,
        uint256 newWeightFactorMemberships
    ) public onlyAdmin {
        weightFactorTokens = newWeightFactorTokens;
        weightFactorMemberships = newWeightFactorMemberships;
    }

    function collectDust(uint256 amount) public onlyAdmin {
        payable(owner()).transfer(amount);
    }

    receive() external payable {
        payable(owner()).transfer(msg.value);
    }

    function getMembershipsOf(address user)
        external
        view
        returns (uint256[] memory)
    {
        return userInfo[user].membershipIds;
    }

    function getStake(address user)
        external
        view
        returns (
            uint256,
            uint256[] memory,
            uint256,
            uint256
        )
    {
        uint256 totalShares = getTotalSharesAbs();
        return (
            userInfo[user].tokens,
            userInfo[user].membershipIds,
            totalShares == 0
                ? 0
                : (getUserSharesAbs(user) * PRECISION_FACTOR) / totalShares,
            _calculatePendingRewards(user)
        );
    }
}
