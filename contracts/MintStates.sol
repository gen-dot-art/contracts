// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

uint256 constant ALLOWED_MINTS_GOLD = 1;
uint256 constant ALLOWED_MINTS_STANDARD = 1;
uint256 constant RESERVED_GOLD_SUPPLY = 100;

library MintStates {
    struct State {
        // maps membershipIds to the amount of mints
        mapping(uint256 => uint256) _mints;
        uint256 _goldMints;
    }

    function getMints(State storage state, uint256 membershipId)
        internal
        view
        returns (uint256)
    {
        return state._mints[membershipId];
    }

    function getAllowedMints(bool isGold) internal pure returns (uint256) {
        return (isGold ? ALLOWED_MINTS_GOLD : ALLOWED_MINTS_STANDARD);
    }

    function getAvailableMints(
        State storage state,
        uint256 membershipId,
        bool isGold,
        uint256 collectionSupply,
        uint256 currentSupply
    ) internal view returns (uint256) {
        uint256 reserved = !isGold
            ? (RESERVED_GOLD_SUPPLY - state._goldMints)
            : 0;
        uint256 availableMints = collectionSupply - currentSupply - reserved;

        return
            availableMints > 0
                ? getAllowedMints(isGold) - getMints(state, membershipId)
                : 0;
    }

    function update(
        State storage state,
        uint256 membershipId,
        bool isGold,
        uint256 value
    ) internal {
        unchecked {
            state._mints[membershipId] += value;
        }
        if (isGold) {
            unchecked {
                state._goldMints += value;
            }
        }
    }
}
