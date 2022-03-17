// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @dev This implements an optional extension of {ERC721Enumerable} defined in the EIP that adds
 * enumerability of all the token ids in the contract as well as all token ids owned by each
 * account.
 */
abstract contract GenArtAccess is Ownable {
    mapping(address => bool) public admins;

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyAdmin() {
        address sender = _msgSender();
        require(
            owner() == sender || admins[sender],
            "Ownable: caller is not the owner nor admin"
        );
        _;
    }

    function addAdminAccess(address admin, bool access) public onlyOwner {
        admins[admin] = access;
    }
}
