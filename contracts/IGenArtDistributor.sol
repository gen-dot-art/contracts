// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IGenArtDistributor {
    function receiveFunds(
        address collection,
        uint256 rewards,
        uint256 refunds
    ) external payable;
}
