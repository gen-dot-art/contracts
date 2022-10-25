// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./GenArtMinter.sol";

contract GenArtFlashMinter is IGenArtMinter, GenArtMinter {
    constructor(
        address genartInterface_,
        address genartCurated_,
        address membershipLendingPool_
    ) GenArtMinter(genartInterface_, genartCurated_, membershipLendingPool_) {}

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

    function mintFlash(address collection) external payable {
        _checkMintFlash(collection);
        uint256 membershipId = collections[collection].pooledMemberships[
            collections[collection].pooledMemberships.length - 1
        ];
        collections[collection].pooledMemberships.pop();
        _mint(collection, membershipId, true);
    }
}
