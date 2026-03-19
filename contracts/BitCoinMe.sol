// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title BitCoinMe Token
 * @dev Token ERC20 avec supply plafonné et gestion multi-propriétaires
 *
 * Caractéristiques:
 * - Supply initial: 6,666,666,666 BCM
 * - Supply maximum: 8,888,888,888 BCM
 * - Multi-propriétaires via AccessControlEnumerable
 * - Protection contre la suppression du dernier admin
 * - Transparent: toutes les actions sont traçables via events
 *
 * Modifications v2:
 * - Remplacement de AccessControl par AccessControlEnumerable pour pouvoir
 *   compter les membres d'un rôle (nécessaire pour la protection last-admin)
 * - Protection dans removeOwner(): impossible de retirer le dernier admin
 * - Le déployeur reçoit maintenant aussi ses rôles, qu'il soit ou non
 *   dans la liste initialOwners, évitant le cas où il détiendrait des
 *   tokens sans aucun rôle associé
 * - Ajout d'une fonction burn() pour permettre aux détenteurs de brûler
 *   leurs propres tokens
 */
contract BitCoinMe is ERC20, AccessControlEnumerable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Supply maximum en unités de base (avec 18 décimales)
    uint256 public constant MAX_SUPPLY = 8_888_888_888 * 10**18;

    /**
     * @dev Événement émis lors du mint de nouveaux tokens
     */
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);

    /**
     * @dev Événement émis lors de l'ajout d'un propriétaire
     */
    event OwnerAdded(address indexed newOwner, address indexed addedBy);

    /**
     * @dev Événement émis lors du retrait d'un propriétaire
     */
    event OwnerRemoved(address indexed owner, address indexed removedBy);

    /**
     * @dev Événement émis lors du burn de tokens
     */
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructeur du contrat
     * @param initialOwners Liste des adresses qui seront propriétaires initiaux
     *
     * Le déployeur reçoit toujours:
     * - Le rôle DEFAULT_ADMIN_ROLE (peut gérer tous les rôles)
     * - Le rôle MINTER_ROLE (peut minter des tokens)
     * - L'initial supply de 6,666,666,666 BCM
     *
     * Les adresses de initialOwners reçoivent également les deux rôles,
     * qu'elles soient ou non identiques au déployeur (pas de doublon grâce
     * au comportement interne de AccessControl).
     */
    constructor(address[] memory initialOwners) ERC20("BitCoinMe!", "BCM") {
        require(initialOwners.length > 0, "Au moins un proprietaire requis");

        // Le deployer recoit systematiquement les roles et l'initial supply
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        uint256 initialSupply = 6_666_666_666 * 10**18;
        _mint(msg.sender, initialSupply);

        // Configurer les roles pour tous les proprietaires initiaux
        for (uint256 i = 0; i < initialOwners.length; i++) {
            require(initialOwners[i] != address(0), "Adresse proprietaire invalide");
            _grantRole(DEFAULT_ADMIN_ROLE, initialOwners[i]);
            _grantRole(MINTER_ROLE, initialOwners[i]);
            emit OwnerAdded(initialOwners[i], msg.sender);
        }
    }

    /**
     * @dev Mint de nouveaux tokens
     * @param to Adresse qui recevra les tokens
     * @param amount Quantité de tokens à minter (en unités de base)
     *
     * Restrictions:
     * - Seuls les détenteurs du MINTER_ROLE peuvent appeler
     * - Ne peut pas dépasser MAX_SUPPLY
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "Mint vers adresse zero");
        require(totalSupply() + amount <= MAX_SUPPLY, "Depassement du supply maximum");

        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }

    /**
     * @dev Brûler des tokens de son propre solde
     * @param amount Quantité de tokens à brûler (en unités de base)
     *
     * N'importe quel détenteur peut brûler ses propres tokens.
     * Le totalSupply diminue, offrant plus de place pour minter si besoin.
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Ajouter un nouveau propriétaire
     * @param newOwner Adresse du nouveau propriétaire
     *
     * Le nouveau propriétaire reçoit:
     * - DEFAULT_ADMIN_ROLE (peut gérer d'autres propriétaires)
     * - MINTER_ROLE (peut minter des tokens)
     */
    function addOwner(address newOwner) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newOwner != address(0), "Adresse proprietaire invalide");

        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _grantRole(MINTER_ROLE, newOwner);
        emit OwnerAdded(newOwner, msg.sender);
    }

    /**
     * @dev Retirer un propriétaire
     * @param owner Adresse du propriétaire à retirer
     *
     * Retire tous les rôles de l'adresse spécifiée.
     * PROTECTION: impossible de retirer le dernier admin (évite le lockout).
     */
    function removeOwner(address owner) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(owner != address(0), "Adresse proprietaire invalide");
        require(
            getRoleMemberCount(DEFAULT_ADMIN_ROLE) > 1,
            "Impossible de retirer le dernier administrateur"
        );

        _revokeRole(DEFAULT_ADMIN_ROLE, owner);
        _revokeRole(MINTER_ROLE, owner);
        emit OwnerRemoved(owner, msg.sender);
    }

    /**
     * @dev Vérifier si une adresse est propriétaire
     * @param account Adresse à vérifier
     * @return bool true si l'adresse a le rôle DEFAULT_ADMIN_ROLE
     */
    function isOwner(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, account);
    }

    /**
     * @dev Obtenir le supply restant disponible pour le mint
     * @return uint256 Quantité de tokens pouvant encore être mintés
     */
    function remainingMintableSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}
