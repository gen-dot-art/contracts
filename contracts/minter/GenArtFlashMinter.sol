// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./MintAlloc.sol";
import "../access/GenArtAccess.sol";
import "../app/GenArtCurated.sol";
import "../interface/IGenArtMinter.sol";
import "../interface/IGenArtInterface.sol";
import "../interface/IGenArtERC721.sol";
import "../interface/IGenArtPaymentSplitterV4.sol";

contract GenArtFlashMinter is GenArtAccess, IGenArtMinter {
    using MintAlloc for MintAlloc.State;

    struct Pricing {
        address artist;
        uint256 startTime;
        uint256 price;
        uint256[] pooledMemberships;
    }

    address public genArtCurated;
    address public genartInterface;
    address public membershipLendingPool;
    uint256 public lendingFeePercentage = 20;

    mapping(address => MintAlloc.State) public mintstates;
    mapping(address => Pricing) public collections;

    event PricingSet(address collection, uint256 startTime, uint256 price);

    constructor(
        address genartInterface_,
        address genartCurated_,
        address membershipLendingPool_
    ) GenArtAccess() {
        genartInterface = genartInterface_;
        genArtCurated = genartCurated_;
        membershipLendingPool = membershipLendingPool_;
    }

    function addPricing(address collection, address artist)
        external
        override
        onlyAdmin
    {
        require(
            collections[collection].artist == address(0),
            "pricing already exists for collection"
        );
        uint256[] memory pooledMemberships = IGenArtInterface(genartInterface)
            .getMembershipsOf(membershipLendingPool);
        collections[collection] = Pricing(artist, 0, 0, pooledMemberships);
    }

    function setPricing(
        address collection,
        uint256 startTime,
        uint256 price,
        uint8[3] memory mintAlloc
    ) external {
        require(
            collections[collection].artist == msg.sender || admins[msg.sender],
            "only artist or admin allowed"
        );
        require(
            collections[collection].startTime < block.timestamp,
            "mint already started for collection"
        );
        require(startTime > block.timestamp, "startTime too early");
        if (collections[collection].price > 0) {
            require(admins[msg.sender], "only admin allowed");
        }
        collections[collection].startTime = startTime;
        collections[collection].price = price;
        mintstates[collection].init(mintAlloc);
        emit PricingSet(collection, startTime, price);
    }

    function getPrice(address collection)
        public
        view
        override
        returns (uint256)
    {
        return collections[collection].price;
    }

    function _checkMint(address collection, uint256 amount) internal view {
        require(
            msg.value >= getPrice(collection) * amount,
            "wrong amount sent"
        );
        require(
            collections[collection].startTime != 0 &&
                collections[collection].startTime <= block.timestamp,
            "mint not started yet"
        );
    }

    function _checkMintFlash(address collection) internal view {
        require(
            collections[collection].pooledMemberships.length > 0,
            "no memberships available"
        );
        require(
            msg.value >=
                ((getPrice(collection) * (100 + lendingFeePercentage)) / 100),
            "wrong amount sent flash"
        );
        require(
            collections[collection].startTime != 0 &&
                collections[collection].startTime <= block.timestamp,
            "mint not started yet"
        );
    }

    function _checkAvailableMints(
        address collection,
        uint256 membershipId,
        uint256 amount,
        bool isFlashloan
    ) internal view {
        (, , , , , uint256 maxSupply, uint256 totalSupply) = IGenArtERC721(
            collection
        ).getInfo();

        uint256 availableMints = mintstates[collection].getAvailableMints(
            MintParams(
                membershipId,
                IGenArtInterface(genartInterface).isGoldToken(membershipId),
                maxSupply,
                totalSupply
            )
        );
        if (!isFlashloan) {
            require(
                IGenArtInterface(genartInterface).ownerOfMembership(
                    membershipId
                ) == msg.sender,
                "sender must be owner of membership"
            );
        } else {
            require(
                IGenArtInterface(genartInterface).ownerOfMembership(
                    membershipId
                ) == membershipLendingPool,
                "sender must be owner of membership"
            );
        }

        require(availableMints >= amount, "no mints available");
    }

    function mintOne(address collection, uint256 membershipId)
        public
        payable
        override
    {
        _checkMint(collection, 1);
        _mint(collection, membershipId, false);
    }

    function mintFlash(address collection) external payable {
        _checkMintFlash(collection);
        uint256 membershipId = collections[collection].pooledMemberships[
            collections[collection].pooledMemberships.length - 1
        ];
        collections[collection].pooledMemberships.pop();
        _mint(collection, membershipId, true);
    }

    function _mint(
        address collection,
        uint256 membershipId,
        bool isFlashLoan
    ) internal {
        _checkAvailableMints(collection, membershipId, 1, isFlashLoan);
        mintstates[collection].update(
            MintUpdateParams(
                membershipId,
                IGenArtInterface(genartInterface).isGoldToken(membershipId),
                1
            )
        );
        IGenArtERC721(collection).mint(msg.sender, membershipId);
        _splitPayment(collection, isFlashLoan);
    }

    function mint(address collection, uint256 amount)
        external
        payable
        override
    {
        // get all available mints for sender
        _checkMint(collection, amount);

        (, , , , , uint256 maxSupply, uint256 totalSupply) = IGenArtERC721(
            collection
        ).getInfo();
        // get all memberships for sender
        address minter = _msgSender();
        uint256[] memory memberships = IGenArtInterface(genartInterface)
            .getMembershipsOf(minter);
        uint256 minted;
        uint256 i;
        MintAlloc.State storage state = mintstates[collection];
        // loop until the desired amount of tokens was minted
        while (minted < amount && i < memberships.length) {
            // get available mints for membership
            uint256 membershipId = memberships[i];
            bool isGold = IGenArtInterface(genartInterface).isGoldToken(
                membershipId
            );
            uint256 mints = state.getAvailableMints(
                MintParams(membershipId, isGold, maxSupply, totalSupply)
            );
            // mint tokens with membership and stop if desired amount reached
            uint256 j;
            for (j = 0; j < mints && minted < amount; j++) {
                IGenArtERC721(collection).mint(minter, membershipId);
                minted++;
            }
            // update mint state once membership minted tokens
            state.update(MintUpdateParams(membershipId, isGold, j));
            i++;
        }
        require(minted > 0, "no mints available");
        _splitPayment(collection, false);
    }

    function _splitPayment(address collection, bool isFlashLoan) internal {
        address paymentSplitter = GenArtCurated(genArtCurated)
            .getPaymentSplitterForCollection(collection);
        uint256 amount;
        if (!isFlashLoan) {
            amount = msg.value;
        } else {
            amount = (msg.value / (100 + lendingFeePercentage)) * 100;
            payable(membershipLendingPool).transfer(msg.value - amount);
        }
        IGenArtPaymentSplitterV4(paymentSplitter).splitPayment{value: amount}();
    }

    function setInterface(address genartInterface_) public onlyAdmin {
        genartInterface = genartInterface_;
    }

    function setMembershipLendingFee(uint256 fee) public onlyAdmin {
        lendingFeePercentage = fee;
    }

    function setMembershipLendingPool(address poolAddress) public onlyAdmin {
        membershipLendingPool = poolAddress;
    }

    /**
     *@dev Get available mints for an account
     */
    function getAvailableMintsForAccount(address collection, address account)
        public
        view
        override
        returns (uint256)
    {
        uint256[] memory memberships = IGenArtInterface(genartInterface)
            .getMembershipsOf(account);
        (, , , , , uint256 maxSupply, uint256 totalSupply) = IGenArtERC721(
            collection
        ).getInfo();
        uint256 availableMints;
        for (uint256 i; i < memberships.length; i++) {
            availableMints += mintstates[collection].getAvailableMints(
                MintParams(
                    memberships[i],
                    IGenArtInterface(genartInterface).isGoldToken(
                        memberships[i]
                    ),
                    maxSupply,
                    totalSupply
                )
            );
        }
        return availableMints;
    }

    /**
     *@dev Get available mints for a membershipId
     */
    function getAvailableMintsForMembership(
        address collection,
        uint256 membershipId
    ) public view override returns (uint256) {
        (, , , , , uint256 maxSupply, uint256 totalSupply) = IGenArtERC721(
            collection
        ).getInfo();
        return
            mintstates[collection].getAvailableMints(
                MintParams(
                    membershipId,
                    IGenArtInterface(genartInterface).isGoldToken(membershipId),
                    maxSupply,
                    totalSupply
                )
            );
    }

    /**
     *@dev Get amount of mints for a membershipId
     */
    function getMembershipMints(address collection, uint256 membershipId)
        public
        view
        override
        returns (uint256)
    {
        return mintstates[collection].getMints(membershipId);
    }

    function getMintAlloc(address collection)
        external
        view
        returns (
            uint8,
            uint8,
            uint8,
            uint256
        )
    {
        return (
            mintstates[collection].reservedGoldSupply,
            mintstates[collection].allowedMintGold,
            mintstates[collection].allowedMintStandard,
            mintstates[collection]._goldMints
        );
    }
}
