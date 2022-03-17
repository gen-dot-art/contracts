// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "./GenArtAccess.sol";

/**
 * @dev This implements an optional extension of {ERC721Enumerable} defined in the EIP that adds
 * enumerability of all the token ids in the contract as well as all token ids owned by each
 * account.
 */
abstract contract GenArtERC721 is GenArtAccess, ERC721Enumerable, IERC2981 {
    uint256 public constant ROYALTY_FEE = 750;
    address private royaltyReceiver;

    constructor(address _royaltyReceiver) {
        royaltyReceiver = _royaltyReceiver;
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, IERC165)
        returns (bool)
    {
        return
            interfaceId == type(IERC2981).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function burn(uint256 tokenId) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "GenArtERC721: burn caller is not owner nor approved"
        );
        _burn(tokenId);
    }

    /**
     * @dev See {ERC721-_burn}. This override additionally clears the royalty information for the token.
     */
    function _burn(uint256 tokenId) internal virtual override {
        super._burn(tokenId);
    }

    /**
     * @dev Get royalty info see IERC2981
     */
    function royaltyInfo(uint256, uint256 _salePrice)
        external
        view
        virtual
        override
        returns (address, uint256)
    {
        return (royaltyReceiver, (ROYALTY_FEE * _salePrice) / 1000);
    }

    function setRoyaltyReceiver(address receiver) public onlyAdmin {
        royaltyReceiver = receiver;
    }
}
