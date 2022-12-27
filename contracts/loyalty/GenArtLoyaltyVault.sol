// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interface/IGenArtInterfaceV4.sol";
import "../access/GenArtAccess.sol";

/**
 * @title GenArtValut
 * @notice It handles the distribution of ETH loyalties
 * @notice forked from https://etherscan.io/address/0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce#code
 */
contract GenArtLoyaltyVault is ReentrancyGuard, GenArtAccess {
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

    uint256 public weightFactorTokens = 2;
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
     * @notice Deposit staked tokens (and collect reward tokens if requested)
     * @param amount amount to deposit (in GENART)
     */
    function deposit(uint256[] memory membershipIds, uint256 amount)
        external
        nonReentrant
    {
        address sender = _msgSender();
        _checkDeposit(sender, membershipIds, amount);
        _deposit(sender, membershipIds, amount);
    }

    function harvest() external nonReentrant {
        address sender = _msgSender();
        uint256 pendingRewards = _harvest(sender);
        require(pendingRewards > 0, "zero rewards to harvest");
        // Transfer reward token to sender
        payable(sender).transfer(pendingRewards);
    }

    /**
     * @notice Withdraw all staked tokens (and collect reward tokens if requested)
     */
    function withdraw() external nonReentrant {
        address sender = _msgSender();
        require(userInfo[sender].tokens > 0, "zero shares");
        _withdraw(sender);
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

    function setWeightFactors(
        uint256 newWeightFactorTokens,
        uint256 newWeightFactorMemberships
    ) public onlyAdmin {
        weightFactorTokens = newWeightFactorTokens;
        weightFactorMemberships = newWeightFactorMemberships;
    }

    function collectDust(uint256 amount) public onlyGenArtAdmin {
        payable(owner()).transfer(amount);
    }

    /**
     * checks requirements for depositing a stake
     */
    function _checkDeposit(
        address user,
        uint256[] memory membershipIds,
        uint256 amount
    ) internal view {
        // check required amount of tokens
        require(
            amount >=
                (
                    userInfo[user].membershipIds.length == 0
                        ? 4000 * PRECISION_FACTOR
                        : 0
                ),
            "min 4000 tokens required"
        );
        if (userInfo[user].membershipIds.length == 0) {
            require(
                membershipIds.length > 0,
                "minimum one GEN.ART membership required"
            );
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
                IGenArtInterfaceV4(genartInterface).isGoldToken(membershipId)
                    ? 5
                    : 1
            ) * PRECISION_FACTOR;
    }

    function _deposit(
        address user,
        uint256[] memory membershipIds,
        uint256 amount
    ) internal {
        // Update reward for user
        _updateReward(user);
        // send memberships to this contract
        for (uint256 i; i < membershipIds.length; i++) {
            IERC721(genartMembership).transferFrom(
                user,
                address(this),
                membershipIds[i]
            );
            // save the membership token Ids
            userInfo[user].membershipIds.push(membershipIds[i]);
            membershipOwners[membershipIds[i]] = user;
            // adjust internal membership shares
            totalMembershipShares += _getMembershipShareValue(membershipIds[i]);
        }

        // Transfer GENART tokens to this address
        genartToken.transferFrom(user, address(this), amount);

        // Adjust internal token shares
        userInfo[user].tokens += amount;
        totalTokenShares += amount;

        emit Deposit(user, amount);
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
    function _withdraw(address user) internal {
        // harvest rewards
        uint256 pendingRewards = _harvest(user);
        uint256 tokens = userInfo[user].tokens;
        uint256[] memory memberships = userInfo[user].membershipIds;

        // adjust internal token shares
        userInfo[user].tokens = 0;
        totalTokenShares -= tokens;

        // Transfer GENART tokens to user
        genartToken.safeTransfer(user, tokens);
        for (uint256 i = memberships.length; i >= 1; i--) {
            // remove membership token id from user info object
            userInfo[user].membershipIds.pop();
            membershipOwners[memberships[i - 1]] = address(0);
            // adjust internal membership shares
            totalMembershipShares -= _getMembershipShareValue(
                memberships[i - 1]
            );
            IERC721(genartMembership).transferFrom(
                address(this),
                user,
                memberships[i - 1]
            );
        }
        // Transfer reward token to user
        payable(user).transfer(pendingRewards);
        emit Withdraw(user, tokens);
    }

    /**
     * @notice Harvest reward tokens that are pending
     */
    function _harvest(address user) internal returns (uint256) {
        // Update reward for user
        _updateReward(user);

        // Retrieve pending rewards
        uint256 pendingRewards = userInfo[user].rewards;

        if (pendingRewards == 0) return 0;
        // Adjust user rewards and transfer
        userInfo[user].rewards = 0;

        emit Harvest(user, pendingRewards);

        return pendingRewards;
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
        if (totalTokenShares == 0) {
            return rewardPerTokenStored;
        }

        return
            rewardPerTokenStored +
            ((_lastRewardBlock() - lastUpdateBlock) * (currentRewardPerBlock));
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
            (((getUserShares(user)) *
                (_rewardPerShare() - (userInfo[user].userRewardPerTokenPaid))) /
                PRECISION_FACTOR) + userInfo[user].rewards;
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
     * @notice Return weighted shares of user
     */
    function getUserShares(address user) public view returns (uint256) {
        uint256 userMembershipShares;
        for (uint256 i = 0; i < userInfo[user].membershipIds.length; i++) {
            userMembershipShares += _getMembershipShareValue(
                userInfo[user].membershipIds[i]
            );
        }
        unchecked {
            uint256 tokenShares = totalTokenShares == 0
                ? 0
                : (weightFactorTokens *
                    userInfo[user].tokens *
                    PRECISION_FACTOR) / totalTokenShares;

            uint256 membershipShares = totalMembershipShares == 0
                ? 0
                : (weightFactorMemberships *
                    userMembershipShares *
                    PRECISION_FACTOR) / totalMembershipShares;
            return
                (tokenShares + membershipShares) /
                (weightFactorMemberships + weightFactorTokens);
        }
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
        return (
            userInfo[user].tokens,
            userInfo[user].membershipIds,
            totalTokenShares == 0 ? 0 : getUserShares(user),
            _calculatePendingRewards(user)
        );
    }

    function getMembershipsOf(address user)
        external
        view
        returns (uint256[] memory)
    {
        return userInfo[user].membershipIds;
    }

    receive() external payable {
        payable(owner()).transfer(msg.value);
    }
}
