// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "./GenArtAccess.sol";
import "./MintStates.sol";
import "./IGenArtMembership.sol";
import "./IGenArtPaymentSplitter.sol";
import "./IGenArtInterfaceV2.sol";

/**
 * @dev GEN.ART ERC721 V1
 * Implements the extentions {IERC721Enumerable} and {IERC2981}.
 * Inherits access control from {GenArtAccess}.
 * Sends all ETH to a {PaymentSplitter} contract.
 * Restricts minting to GEN.ART Membership holders.
 * IMPORTANT: This implementation requires the royalties to be send to the contracts address
 * in order to split the funds between payees automatically.
 */
contract GenArtERC721 is ERC721Enumerable, GenArtAccess, IERC2981 {
    using Strings for uint256;
    using MintStates for MintStates.State;
    struct Token {
        uint256 id;
    }

    uint256 public constant MINT_PRICE = 0.2 ether;

    uint256 public _mintSupply;
    address public _royaltyReceiver = address(this);
    uint256 public _collectionId = 20000;
    bool private _reservedMinted;
    address public _artist;
    mapping(uint256 => Token) public _tokens;
    address public _paymentSplitter;
    address public _genartInterface;
    address public _genartMembership;
    string private _uri;
    bool public _paused = true;

    MintStates.State public _mintstate;

    /**
     *@dev Emitted in mint
     */
    event Mint(
        uint256 tokenId,
        uint256 collectionId,
        uint256 membershipId,
        address to
    );

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_,
        uint256 mintSupply_,
        uint256 reservedGold_,
        address genartMembership_,
        address genartInterface_,
        address paymentSplitter_,
        address artist_
    ) ERC721(name_, symbol_) GenArtAccess() {
        _artist = artist_;
        _mintSupply = mintSupply_;
        _paymentSplitter = paymentSplitter_;
        _genartInterface = genartInterface_;
        _genartMembership = genartMembership_;
        _mintstate.init(reservedGold_);
        _uri = uri_;
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

    /**
     *@dev Get available mints for an account
     */
    function getAvailableMintsForAccount(address account)
        public
        view
        returns (uint256)
    {
        uint256[] memory memberships = IGenArtMembership(_genartMembership)
            .getTokensByOwner(account);

        uint256 availableMints;
        for (uint256 i; i < memberships.length; i++) {
            availableMints += _mintstate.getAvailableMints(
                memberships[i],
                IGenArtInterfaceV2(_genartInterface).isGoldToken(
                    memberships[i]
                ),
                _mintSupply,
                totalSupply()
            );
        }
        return availableMints;
    }

    /**
     *@dev Get available mints for a membershipId
     */
    function getAvailableMintsForMembership(uint256 membershipId)
        public
        view
        returns (uint256)
    {
        return
            _mintstate.getAvailableMints(
                membershipId,
                IGenArtInterfaceV2(_genartInterface).isGoldToken(membershipId),
                _mintSupply,
                totalSupply()
            );
    }

    /**
     *@dev Get amount of mints for a membershipId
     */
    function getMembershipMints(uint256 membershipId)
        public
        view
        returns (uint256)
    {
        return _mintstate.getMints(membershipId);
    }

    /**
     *@dev Check if minter has available mint slots and has sent the required amount of ETH
     * Revert in case minting is paused or checks fail.
     */
    function checkMint(uint256 amount, uint256 availableMints) internal view {
        require(!_paused, "GenArtERC721: minting is paused");
        require(availableMints > 0, "GenArtERC721: no mints available");
        require(
            availableMints >= amount,
            "GenArtERC721: amount exceeds availableMints"
        );
        uint256 ethAmount;
        unchecked {
            ethAmount = MINT_PRICE * amount;
        }
        require(
            ethAmount <= msg.value,
            "GenArtERC721: transaction underpriced"
        );
    }

    /**
     *@dev Public function to mint the desired amount of tokens
     * Requirments:
     * - sender must be GEN.ART Membership owner
     */
    function mint(address to, uint256 amount) public payable {
        // get all available mints for sender
        uint256 availableMints = getAvailableMintsForAccount(_msgSender());
        checkMint(amount, availableMints);
        // get all memberships for sender
        uint256[] memory memberships = IGenArtMembership(_genartMembership)
            .getTokensByOwner(_msgSender());
        uint256 minted;
        uint256 i;

        // loop until the desired amount of tokens was minted
        while (minted < amount && i < memberships.length) {
            // check if membership is gold
            bool isGold = IGenArtInterfaceV2(_genartInterface).isGoldToken(
                memberships[i]
            );
            // get available mints for membership
            uint256 mints = _mintstate.getAvailableMints(
                memberships[i],
                isGold,
                _mintSupply,
                totalSupply()
            );
            // mint tokens with membership and stop if desired amount reached
            for (uint256 j; j < mints && minted < amount; j++) {
                mintForMembership(to, memberships[i], isGold);
                minted++;
            }
            i++;
        }
        // send funds to PaymentSplitter
        IGenArtPaymentSplitter(_paymentSplitter).splitPayment{value: msg.value}(
            address(this)
        );
    }

    function mintOne(address to, uint256 membershipId) public payable {
        // check if sender is owner of membership
        require(
            IGenArtInterfaceV2(_genartInterface).ownerOf(membershipId) ==
                _msgSender(),
            "GenArtERC721: sender is not membership owner"
        );
        // get available mints for membership
        uint256 availableMints = getAvailableMintsForMembership(membershipId);

        checkMint(1, availableMints);
        // mint token
        mintForMembership(
            to,
            membershipId,
            IGenArtInterfaceV2(_genartInterface).isGoldToken(membershipId)
        );
        // send funds to PaymentSplitter
        IGenArtPaymentSplitter(_paymentSplitter).splitPayment{value: msg.value}(
            address(this)
        );
    }

    /**
     *@dev Mint token for membership
     */
    function mintForMembership(
        address to,
        uint256 membershipId,
        bool isGold
    ) internal {
        // update mint state once membership minted a token
        _mintstate.update(membershipId, isGold, 1);
        _mintOne(to, membershipId);
    }

    /**
     * @dev Mints `tokenId` and transfers it to `to`.
     *
     * Requirements:
     *
     * - `tokenId` must not exist.
     * - `to` cannot be the zero address.
     *
     * Emits a {Transfer} event.
     * Emits a {Mint} event.
     */
    function _mintOne(address to, uint256 membershipId) internal virtual {
        uint256 tokenId = _collectionId * 100_000 + totalSupply() + 1;
        _safeMint(to, tokenId);
        _tokens[tokenId] = Token({id: tokenId});
        emit Mint(tokenId, _collectionId, membershipId, to);
    }

    /**
     *@dev Reserved mints can only be called by admins
     * Only one possible mint.
     */
    function mintReserved(address to) public onlyAdmin {
        require(!_reservedMinted, "GenArtERC721: reserved already minted");
        _mintOne(to, 0);
        _reservedMinted = true;
    }

    function burn(uint256 tokenId) public {
        // check if sender is owner of token
        address owner = ERC721.ownerOf(tokenId);
        require(
            _msgSender() == owner,
            "GenArtERC721: burn caller is not owner"
        );
        _burn(tokenId);
    }

    /**
     *@dev Pause and unpause minting
     */
    function setReservedGold(uint256 reserved) public onlyGenArtAdmin {
        _mintstate.setReservedGold(reserved);
    }

    /**
     *@dev Pause and unpause minting
     */
    function setPaused(bool paused) public onlyAdmin {
        _paused = paused;
    }

    /**
     * @dev Get collection info
     */
    function getCollectionInfo()
        public
        view
        returns (
            uint256 collectionId,
            string memory name,
            uint256 invocations,
            uint256 maxInvocations,
            uint256 price,
            address artist
        )
    {
        return (
            _collectionId,
            name,
            totalSupply(),
            _mintSupply,
            MINT_PRICE,
            _artist
        );
    }

    /**
     * @dev Get royalty info see {IERC2981}
     */
    function royaltyInfo(uint256, uint256 salePrice_)
        external
        view
        virtual
        override
        returns (address, uint256)
    {
        return (
            _royaltyReceiver,
            ((
                IGenArtPaymentSplitter(_paymentSplitter)
                    .getTotalSharesOfCollection(address(this), 1)
            ) * salePrice_) / 1000
        );
    }

    function setRoyaltyReceiver(address receiver) public onlyGenArtAdmin {
        _royaltyReceiver = receiver;
    }

    /**
     *@dev Get all tokens owned by an address
     */
    function getTokensByOwner(address _owner)
        public
        view
        returns (uint256[] memory)
    {
        uint256 tokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](tokenCount);
        for (uint256 i; i < tokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }

        return tokenIds;
    }

    /**
     * @dev Set base uri. Only allowed by admins
     */
    function setBaseURI(string memory uri) public onlyGenArtAdmin {
        _uri = uri;
    }

    /**
     * @dev Base URI for computing {tokenURI}. If set, the resulting URI for each
     * token will be the concatenation of the `baseURI` and the `tokenId`. Empty
     * by default, can be overriden in child contracts.
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _uri;
    }

    /**
     *@dev Royalties are forwarded to {PaymentSplitter}
     */
    receive() external payable {
        IGenArtPaymentSplitter(_paymentSplitter).splitPaymentRoyalty{
            value: msg.value
        }(address(this));
    }
}
