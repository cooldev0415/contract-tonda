// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title TondaToken
 * @dev Implementation of the Tonda Token with advanced features:
 * - Burnable: Tokens can be irreversibly burned (destroyed)
 * - Pausable: Token transfers can be paused in emergency situations
 * - AccessControl: Role-based permissions for administrative actions
 * - Permit: Gasless token approvals
 */
contract TondaToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl, ERC20Permit {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor that gives the msg.sender all existing tokens.
     * @param initialSupply The initial token supply to mint
     */
    constructor(uint256 initialSupply)
        ERC20("Tonda Token", "TONDA")
        ERC20Permit("Tonda Token")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _mint(msg.sender, initialSupply);
    }

    /**
     * @dev Creates `amount` new tokens for `to`.
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     *
     * Requirements:
     * - the caller must have the `MINTER_ROLE`
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Pauses all token transfers.
     *
     * Requirements:
     * - the caller must have the `PAUSER_ROLE`
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all token transfers.
     *
     * Requirements:
     * - the caller must have the `PAUSER_ROLE`
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._update(from, to, amount);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 