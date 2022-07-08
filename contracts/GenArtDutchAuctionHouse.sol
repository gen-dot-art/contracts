// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "./GenArtAccess.sol";
import "./IGenArtDutchAuctionHouse.sol";
import "./MintStateDA.sol";
import "./IGenArtInterface.sol";
import "./IGenArtSharing.sol";
import "./IGenArtDARefund.sol";

contract GenArtDutchAuctionHouse is GenArtAccess, IGenArtDutchAuctionHouse {
    using MintStateDA for MintStateDA.State;

    struct Mint {
        uint256 amount;
        uint256 eth;
    }

    mapping(address => MintStateDA.State) public _mintstate;

    // maps collections to auctions
    mapping(address => Auction) public _auctions;

    // maps the auctions to memberships mints by phase
    mapping(address => mapping(address => mapping(uint256 => uint256)))
        public _mints;

    // maps total funds earned by an auction
    mapping(address => uint256) public _auctionFunds;

    // marks if artist funds for an auction have been withdrawn
    mapping(address => bool) public _artistsWithdrawHistory;

    // maps total funds earned by an auction split by phase
    mapping(address => mapping(uint256 => uint256)) public _auctionFundsByPhase;

    // uint256 public constant BLOCKS_PER_HOUR = 260;
    uint256 public constant BLOCKS_PER_HOUR = 1;
    uint256 public constant DECAY = 20;
    uint256 public constant DECAY_PER_BLOCKS = BLOCKS_PER_HOUR * 12;
    uint256 public constant BLOCKS_TO_PUBLIC_MINT = BLOCKS_PER_HOUR * 72;
    uint256 public constant AUCTION_BLOCK_DURATION = BLOCKS_PER_HOUR * 336;
    address public _genartInterface;

    /**
     @dev Shares according to GIP# #0001
          Artist | GEN.ART | GEN.ART Token stakers
     */
    uint256[] public _salesShares = [700, 175, 125];

    // GEN.ART | GenArtSharing (GENART Staking contract) | GenArtDARefund
    address[3] public _payoutAddresses = [owner(), address(0), address(0)];

    modifier onlyCollection(address collection) {
        require(
            _auctions[collection].startBlock > 0,
            "GenArtDutchAuctionHouse: only collection contract allowed"
        );
        _;
    }

    modifier onlyArtist(address collection) {
        require(
            _auctions[collection].artist == msg.sender,
            "GenArtDutchAuctionHouse: only artist allowed"
        );
        _;
    }

    function addAuction(
        address collection,
        address artist,
        uint256 supply,
        uint256 startPrice,
        uint256 startBlock
    ) public override onlyAdmin {
        _auctions[collection] = Auction({
            artist: artist,
            startBlock: startBlock,
            startPrice: startPrice,
            supply: supply,
            endBlock: startBlock + AUCTION_BLOCK_DURATION,
            distributed: false
        });
        _mintstate[collection].init();
    }

    function getAuction(address collection)
        public
        view
        override
        returns (Auction memory)
    {
        Auction memory auction = _auctions[collection];
        require(
            auction.startBlock > 0,
            "GenArtDutchAuctionHouse: auction not found"
        );
        return auction;
    }

    /**
    @dev Get status of an auction
    - 0 : ended
    - 1 : open for GEN.ART members
    - 2 : open for public
    */
    function getAuctionStatus(address collection)
        public
        view
        override
        returns (uint8)
    {
        Auction memory auction = getAuction(collection);
        return
            block.number > auction.endBlock
                ? 0
                : block.number > (auction.startBlock + BLOCKS_TO_PUBLIC_MINT)
                ? 2
                : 1;
    }

    function getAuctionPhase(address collection) public view returns (uint256) {
        uint256 lambda = ((block.number - getAuction(collection).startBlock) /
            DECAY_PER_BLOCKS) + 1;
        // Maximum 4 price reductions
        return lambda > 4 ? 4 : lambda;
    }

    function getAuctionPriceByPhase(address collection, uint256 phase)
        public
        view
        returns (uint256)
    {
        Auction memory auction = getAuction(collection);
        return
            (auction.startPrice * ((100 - DECAY)**(phase - 1))) /
            (100**(phase - 1));
    }

    function getAuctionPrice(address collection)
        public
        view
        override
        returns (uint256)
    {
        Auction memory auction = getAuction(collection);
        require(
            block.number >= auction.startBlock &&
                block.number <= auction.endBlock,
            "GenArtDutchAuctionHouse: auction closed"
        );

        uint8 status = getAuctionStatus(collection);
        return
            status == 2
                ? calcAvgPrice(collection)
                : getAuctionPriceByPhase(
                    collection,
                    getAuctionPhase(collection)
                );
    }

    function calcAvgPrice(address collection) public view returns (uint256) {
        return
            _auctionFunds[collection] /
            (IERC721Enumerable(collection).totalSupply() - 1);
    }

    function getMintsByMembership(address collection, uint256 membershipId)
        public
        view
        returns (uint256)
    {
        return
            _mintstate[collection].getMints(
                membershipId,
                IGenArtInterface(_genartInterface).isGoldToken(membershipId),
                getAuctionPhase(collection)
            );
    }

    function getAvailableMintsByMembership(
        address collection,
        uint256 membershipId
    ) external view override returns (uint256) {
        return
            _mintstate[collection].getAvailableMints(
                membershipId,
                IGenArtInterface(_genartInterface).isGoldToken(membershipId),
                getAuctionPhase(collection),
                getAuction(collection).supply,
                IERC721Enumerable(collection).totalSupply()
            );
    }

    /**
        @dev Calculate the total revenue shares of an auction 
        - `index`: index of `_salesShares`
     */
    function calcShares(address collection, uint8 index)
        internal
        view
        returns (uint256)
    {
        uint256 value = ((_auctionFunds[collection] -
            calcTotalDARefundAmount(collection)) * _salesShares[index]) / 1000;

        return value;
    }

    function calcTotalDARefundAmount(address collection)
        internal
        view
        returns (uint256)
    {
        uint256 refundPhasesEth;
        uint256 refundPhasesSales;
        uint256 currentPhase = 1;
        // calculate avg price and exclude the reserved mint
        uint256 avgPriceDA = calcAvgPrice(collection);
        while (currentPhase <= 4) {
            uint256 price = getAuctionPriceByPhase(collection, currentPhase);
            if (price > avgPriceDA) {
                refundPhasesEth += _auctionFundsByPhase[collection][
                    currentPhase
                ];
                refundPhasesSales +=
                    _auctionFundsByPhase[collection][currentPhase] /
                    price;
            }
            currentPhase++;
        }

        uint256 totalDARefunds = refundPhasesEth -
            (refundPhasesSales * avgPriceDA);

        return totalDARefunds;
    }

    function saveMint(
        uint256 membershipId,
        address minter,
        uint256 amount
    ) external onlyCollection(msg.sender) {
        uint256 phase = getAuctionPhase(msg.sender);
        uint256 value = amount * getAuctionPriceByPhase(msg.sender, phase);
        _mints[msg.sender][minter][phase] += amount;
        _mintstate[msg.sender].update(
            membershipId,
            IGenArtInterface(_genartInterface).isGoldToken(membershipId),
            phase,
            amount
        );
        _auctionFundsByPhase[msg.sender][phase] += value;
    }

    function sendFunds() external payable onlyCollection(msg.sender) {
        _auctionFunds[msg.sender] += msg.value;
    }

    function calcRefundPhase(address collection)
        external
        view
        returns (uint256)
    {
        uint256 refundPhase;
        uint256 currentPhase = 4;
        // get average price
        uint256 avgPriceDA = calcAvgPrice(collection);

        // loop through all phases
        while (currentPhase >= 1) {
            if (getAuctionPriceByPhase(collection, currentPhase) > avgPriceDA) {
                refundPhase = currentPhase;
                // break the loop since remaining phases must be refunded too
                break;
            }
            currentPhase--;
        }
        return refundPhase;
    }

    function withdrawArtist(address collection) public onlyArtist(collection) {
        Auction memory auction = getAuction(collection);
        require(
            block.number > auction.endBlock + 1,
            "GenArtDutchAuctionHouse: auction not ended yet"
        );
        require(
            !_artistsWithdrawHistory[collection],
            "GenArtDutchAuctionHouse: already widthdrawn"
        );
        _artistsWithdrawHistory[collection] = true;
        payable(auction.artist).transfer(calcShares(collection, 0));
    }

    function distributeRewards(address collection) external onlyAdmin {
        Auction memory auction = getAuction(collection);
        require(
            block.number > auction.endBlock,
            "GenArtDutchAuctionHouse: auction not finished yet"
        );
        require(
            !auction.distributed,
            "GenArtDutchAuctionHouse: already distributed"
        );
        require(
            _payoutAddresses[0] != address(0) &&
                _payoutAddresses[1] != address(0) &&
                _payoutAddresses[2] != address(0),
            "GenArtDutchAuctionHouse: payout addresses not set"
        );
        uint256 stakingRewards = calcShares(collection, 2);
        uint256 daRefunds = calcTotalDARefundAmount(collection);
        _auctions[collection].distributed = true;
        IGenArtSharing(_payoutAddresses[1]).updateRewards{
            value: stakingRewards
        }(BLOCKS_PER_HOUR * 24 * 30);
        IGenArtDARefund(_payoutAddresses[2]).receiveFunds{value: daRefunds}(
            collection
        );
        payable(_payoutAddresses[0]).transfer(calcShares(collection, 1));
    }

    function setSalesShares(uint256[] memory newShares) public onlyGenArtAdmin {
        _salesShares = newShares;
    }

    /**
    @dev set the payout address for ETH distribution
    - `index`: 0 (GEN.ART) | 1 (Staking contract) | 2 (Refund contract)
    - `payoutAddress`: new address
 */
    function setPayoutAddress(uint8 index, address payoutAddress)
        public
        onlyGenArtAdmin
    {
        _payoutAddresses[index] = payoutAddress;
    }

    /**
     *@dev Set Interface contract address
     */
    function setInterface(address interfaceAddress) public onlyAdmin {
        _genartInterface = interfaceAddress;
    }

    receive() external payable {
        payable(owner()).transfer(msg.value);
    }
}
