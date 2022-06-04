// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./GenArtAccess.sol";
import "./IGenArtDutchAuctionHouse.sol";
import "./MintStateDA.sol";
import "./IGenArtInterfaceV3.sol";
import "./GenArtDutchAuctionHouse.sol";

contract GenArtDistributor is GenArtAccess {
    struct Stake {
        address owner;
        uint256 memberships;
        uint256 tokens;
        uint256[] membershipIds;
        uint256 startBlock;
        uint256 balance;
    }
    GenArtDutchAuctionHouse public _genartDA;
    mapping(address => uint256) public _rewardsEth;
    mapping(address => uint256) public _refundsEth;
    Stake[] public _stakeHolders;
    address[] public _collections;
    mapping(address => uint256) public _stakeHoldersIndexes;
    mapping(address => mapping(address => uint256)) public _harvestedRewardsEth;
    mapping(address => mapping(address => uint256)) public _harvestedRefundsEth;
    mapping(address => uint256) public _accuHarvestedRewardsEth;

    address public _genartToken;
    address public _genartMembership;
    address public _genartInterface;

    constructor(address genartDA_) {
        _genartDA = GenArtDutchAuctionHouse(payable(genartDA_));
    }

    modifier onlyDAContract() {
        require(
            address(_genartDA) == msg.sender,
            "GenArtRewardDistributor: only DA contract allowed"
        );
        _;
    }

    function stake(uint256[] memory membershipIds, uint256 tokenAmount) public {
        require(
            membershipIds.length > 0,
            "GenArtRewardDistributor: minumium 1 GEN.ART membership"
        );
        require(
            _stakeHolders[_stakeHoldersIndexes[msg.sender]].startBlock == 0,
            "GenArtRewardDistributor: stake already active"
        );
        _addStakeHolder(msg.sender, membershipIds, tokenAmount);

        for (uint256 i; i < membershipIds.length; i++) {
            IERC721(_genartMembership).transferFrom(
                msg.sender,
                address(this),
                membershipIds[i]
            );
        }
        if (tokenAmount > 0) {
            require(
                tokenAmount >= (4000 * 1e18),
                "GenArtRewardDistributor: minimum 4000 $GENART"
            );

            IERC20(_genartToken).transferFrom(
                msg.sender,
                address(this),
                tokenAmount
            );
        }
    }

    function unstake() public {
        require(
            _stakeHolders[_stakeHoldersIndexes[msg.sender]].startBlock > 0,
            "GenArtRewardDistributor: no stake active"
        );
        _unstake(msg.sender);
    }

    function increaseStake(uint256[] memory membershipIds, uint256 tokenAmount)
        public
    {
        Stake storage _stakeHolder = _stakeHolders[
            _stakeHoldersIndexes[msg.sender]
        ];
        require(
            _stakeHolder.startBlock > 0,
            "GenArtRewardDistributor: not stake active"
        );
        _harvest(msg.sender);
        for (uint256 i; i < membershipIds.length; i++) {
            _stakeHolder.membershipIds.push(membershipIds[i]);
            IERC721(_genartMembership).transferFrom(
                msg.sender,
                address(this),
                membershipIds[i]
            );
        }
        if (tokenAmount > 0) {
            IERC20(_genartToken).transferFrom(
                msg.sender,
                address(this),
                tokenAmount
            );
            _stakeHolder.tokens += tokenAmount;
        }
        _stakeHolder.memberships = calcMembershipsStake(msg.sender);
    }

    function withdraw() public {
        Stake storage _stakeHolder = _stakeHolders[
            _stakeHoldersIndexes[msg.sender]
        ];
        uint256 value = _stakeHolder.balance;
        require(value > 0, "GenArtRewardDistributor: Zero balance");
        _stakeHolder.balance = 0;
        payable(msg.sender).transfer(value);
    }

    function harvestAndWithdraw() public {
        _harvest(msg.sender);
        withdraw();
    }

    function harvest(address collection) public {
        _harvestCollection(collection, msg.sender);
    }

    function harvest(address[] memory collections) public {
        for (uint256 i; i < collections.length; i++) {
            _harvestCollection(collections[i], msg.sender);
        }
    }

    function harvest() public {
        _harvest(msg.sender);
    }

    function getTotalShares(address collection)
        public
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        uint256 totalBlocks;
        uint256 totalTokenStake = IERC20(_genartToken).balanceOf(address(this));
        uint256 totalMembershipStake;
        Auction memory auction = _genartDA.getAuction(collection);
        uint256 endBlock = block.number < auction.endBlock
            ? block.number
            : auction.endBlock;
        for (uint256 i; i < _stakeHolders.length; i++) {
            if (_stakeHolders[i].startBlock < endBlock) {
                uint256 startBlock = _stakeHolders[i].startBlock <
                    auction.startBlock
                    ? auction.startBlock
                    : _stakeHolders[i].startBlock;
                totalBlocks += endBlock - startBlock;
                totalMembershipStake += calcMembershipsStake(
                    _stakeHolders[i].owner
                );
            }
        }

        return (totalBlocks, totalTokenStake, totalMembershipStake);
    }

    function calcShare(address collection, address stakeHolder)
        public
        view
        returns (uint256)
    {
        uint256 index = _stakeHoldersIndexes[stakeHolder];
        Stake memory _stakeHolder = _stakeHolders[index];
        (uint256 blocks, uint256 tokens, uint256 memberships) = getTotalShares(
            collection
        );

        uint256 blockShare = getStakedBlocks(collection, stakeHolder) / blocks;
        uint256 tokenShare = _stakeHolder.tokens / tokens;
        uint256 membershipsShare = _stakeHolder.memberships / memberships;

        return (blockShare + tokenShare + membershipsShare) / 3;
    }

    function calcDARefunds(address collection, address stakeHolder)
        public
        view
        returns (uint256)
    {
        uint256 totalRefund;
        uint256 refundPhase = _genartDA.calcRefundPhase(collection);
        uint256 avgPrice = _genartDA.calcAvgPrice(collection);
        while (refundPhase <= 4) {
            uint256 mints = _genartDA._mints(
                collection,
                stakeHolder,
                refundPhase
            );
            uint256 price = _genartDA.getAuctionPriceByPhase(
                collection,
                refundPhase
            );
            totalRefund += (price - avgPrice) * mints;
            refundPhase++;
        }

        return totalRefund;
    }

    function _harvest(address stakeHolder) internal {
        for (uint256 i; i < _collections.length; i++) {
            _harvestCollection(_collections[i], stakeHolder);
        }
        _stakeHolders[_stakeHoldersIndexes[stakeHolder]].startBlock =
            block.number +
            1;
    }

    function _harvestCollection(address collection, address stakeHolder)
        internal
    {
        uint256 share = calcShare(collection, stakeHolder);
        uint256 refunds = calcDARefunds(collection, stakeHolder);
        uint256 rewards = (_rewardsEth[collection] -
            _accuHarvestedRewardsEth[collection]) * share;

        uint256 stakingRewards;
        uint256 daRefunds;
        unchecked {
            stakingRewards =
                rewards -
                _harvestedRewardsEth[collection][stakeHolder];
            daRefunds = refunds - _harvestedRefundsEth[collection][stakeHolder];
        }
        _harvestedRewardsEth[collection][stakeHolder] += stakingRewards;
        _accuHarvestedRewardsEth[collection] += stakingRewards;

        _harvestedRefundsEth[collection][stakeHolder] += daRefunds;
        _stakeHolders[_stakeHoldersIndexes[stakeHolder]].balance += (daRefunds +
            stakingRewards);
    }

    function getStakedBlocks(address collection, address stakeHolder)
        internal
        view
        returns (uint256)
    {
        Auction memory auction = _genartDA.getAuction(collection);
        uint256 endBlock = block.number < auction.endBlock
            ? block.number
            : auction.endBlock;
        uint256 index = _stakeHoldersIndexes[stakeHolder];
        Stake memory _stakeHolder = _stakeHolders[index];
        uint256 startBlock = _stakeHolder.startBlock < auction.startBlock
            ? auction.startBlock
            : _stakeHolder.startBlock;

        return (startBlock - endBlock);
    }

    function _unstake(address stakeHolder) internal {
        _harvest(stakeHolder);
        uint256 index = _stakeHoldersIndexes[stakeHolder];
        Stake memory _stakeHolder = _stakeHolders[index];
        for (uint256 i; i < _stakeHolder.membershipIds.length; i++) {
            IERC721(_genartMembership).transferFrom(
                address(this),
                stakeHolder,
                _stakeHolder.membershipIds[i]
            );
        }
        if (_stakeHolder.tokens > 0) {
            IERC20(_genartToken).transfer(stakeHolder, _stakeHolder.tokens);
        }
        _removeStakeHolder(stakeHolder);
    }

    function _addStakeHolder(
        address stakeHolder,
        uint256[] memory membershipIds,
        uint256 tokenAmount
    ) internal {
        _stakeHoldersIndexes[stakeHolder] = _stakeHolders.length;
        Stake memory _stake = Stake({
            owner: stakeHolder,
            membershipIds: membershipIds,
            tokens: tokenAmount,
            memberships: 0,
            startBlock: block.number,
            balance: 0
        });
        _stakeHolders.push(_stake);
        _stake.memberships = calcMembershipsStake(stakeHolder);
    }

    function _removeStakeHolder(address stakeHolder) internal {
        uint256 index = _stakeHoldersIndexes[stakeHolder];
        _stakeHolders[index] = _stakeHolders[_stakeHolders.length - 1];
        _stakeHoldersIndexes[_stakeHolders[index].owner] = index;
        _stakeHolders.pop();
    }

    function calcMembershipsStake(address stakeHolder)
        internal
        view
        returns (uint256)
    {
        uint256 index = _stakeHoldersIndexes[stakeHolder];
        uint256 membershipStake;
        for (uint256 i; i < _stakeHolders[index].membershipIds.length; i++) {
            membershipStake += IGenArtInterfaceV3(_genartInterface).isGoldToken(
                _stakeHolders[index].membershipIds[i]
            )
                ? 5
                : 1;
        }

        return membershipStake;
    }

    function receiveFunds(
        address collection,
        uint256 rewards,
        uint256 refunds
    ) external payable onlyDAContract {
        _rewardsEth[collection] += rewards;
        _refundsEth[collection] += refunds;
        _collections.push(collection);
    }
}
