# BitCoinMe Token (BCM)

Token ERC20 déployé sur la Binance Smart Chain (BSC) avec gestion multi-propriétaires.

## 📋 Caractéristiques

- **Nom**: BitCoinMe!
- **Symbole**: BCM
- **Décimales**: 18
- **Initial Supply**: 6,666,666,666 BCM
- **Max Supply**: 8,888,888,888 BCM
- **Gestion multi-propriétaires**: Support de plusieurs propriétaires avec droits égaux
- **Transparence totale**: Tous les événements sont enregistrés on-chain
- **Basé sur OpenZeppelin**: Utilise les contrats audités d'OpenZeppelin

## 🔧 Prérequis

- Node.js v18 ou supérieur
- npm ou yarn
- Un wallet avec des BNB sur BSC Testnet
- Une clé API BscScan (pour la vérification du contrat)

## 📦 Installation

```bash
# Cloner le projet
git clone <votre-repo>
cd bitcoinme-token

# Installer les dépendances
npm install
```

## ⚙️ Configuration

1. Créer un fichier `.env` à la racine du projet:

```bash
cp .env.example .env
```

2. Remplir les variables dans `.env`:

```env
PRIVATE_KEY=votre_cle_privee_sans_0x
BSCSCAN_API_KEY=votre_cle_api_bscscan
```

### Obtenir des BNB sur Testnet

Vous pouvez obtenir des BNB gratuits sur le testnet via ces faucets:
- https://testnet.binance.org/faucet-smart
- https://www.bnbchain.org/en/testnet-faucet

### Obtenir une clé API BscScan

1. Créer un compte sur https://bscscan.com
2. Aller dans "API Keys" dans votre profil
3. Créer une nouvelle clé API

## 🚀 Déploiement

### 1. Configurer les propriétaires initiaux

Éditer `scripts/deploy.ts` et modifier le tableau `initialOwners`:

```typescript
const initialOwners: string[] = [
  deployer.address,
  "0xAdresse2",
  "0xAdresse3",
  // Ajoutez autant d'adresses que nécessaire
];
```

### 2. Compiler les contrats

```bash
npm run compile
```

### 3. Tester les contrats (optionnel mais recommandé)

```bash
npm test
```

### 4. Déployer sur BSC Testnet

```bash
npm run deploy:testnet
```

Le script affichera:
- L'adresse du contrat déployé
- Les informations du token
- Les propriétaires configurés
- La commande pour vérifier le contrat

### 5. Vérifier le contrat sur BscScan

```bash
npm run verify:testnet
```

## 📊 Informations du contrat

Après le déploiement, les informations sont sauvegardées dans `deployment-info.json`:

```json
{
  "contractAddress": "0x...",
  "deployer": "0x...",
  "initialOwners": ["0x...", "0x..."],
  "network": "BSC Testnet",
  "chainId": 97,
  "timestamp": "2024-...",
  "tokenInfo": {
    "name": "BitCoinMe!",
    "symbol": "BCM",
    "decimals": "18",
    "initialSupply": "6666666666.0",
    "maxSupply": "8888888888.0"
  }
}
```

## 🔑 Fonctions principales

### Pour les propriétaires

#### Minter des tokens
```solidity
function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE)
```
Crée de nouveaux tokens jusqu'au max supply (8,888,888,888 BCM).

#### Ajouter un propriétaire
```solidity
function addOwner(address newOwner) public onlyRole(DEFAULT_ADMIN_ROLE)
```
Ajoute un nouveau propriétaire avec tous les droits.

#### Retirer un propriétaire
```solidity
function removeOwner(address owner) public onlyRole(DEFAULT_ADMIN_ROLE)
```
Retire tous les droits d'un propriétaire.

### Fonctions publiques

#### Vérifier si une adresse est propriétaire
```solidity
function isOwner(address account) public view returns (bool)
```

#### Obtenir le supply mintable restant
```solidity
function remainingMintableSupply() public view returns (uint256)
```

#### Fonctions ERC20 standard
- `transfer(address to, uint256 amount)`
- `approve(address spender, uint256 amount)`
- `transferFrom(address from, address to, uint256 amount)`
- `balanceOf(address account)`
- `totalSupply()`

## 🔐 Sécurité

### Bonnes pratiques

1. **Ne jamais partager votre clé privée**
2. **Ne jamais committer le fichier `.env`**
3. **Tester sur testnet avant mainnet**
4. **Vérifier les adresses des propriétaires avant le déploiement**
5. **Faire un audit de sécurité pour un déploiement en production**

### Rôles et permissions

Le contrat utilise le système `AccessControl` d'OpenZeppelin avec deux rôles:

- **DEFAULT_ADMIN_ROLE**: Peut gérer les propriétaires et les rôles
- **MINTER_ROLE**: Peut minter de nouveaux tokens

Tous les propriétaires initiaux reçoivent les deux rôles.

## 📝 Events

Le contrat émet les événements suivants pour la transparence:

```solidity
event TokensMinted(address indexed to, uint256 amount, address indexed minter);
event OwnerAdded(address indexed newOwner, address indexed addedBy);
event OwnerRemoved(address indexed owner, address indexed removedBy);
event Transfer(address indexed from, address indexed to, uint256 value); // ERC20
event Approval(address indexed owner, address indexed spender, uint256 value); // ERC20
```

## 🧪 Tests

Le projet inclut une suite de tests complète couvrant:
- Le déploiement
- Le minting (avec respect du max supply)
- La gestion des propriétaires
- Les transferts ERC20
- La transparence (events)

Exécuter les tests:
```bash
npm test
```

## 📚 Structure du projet

```
bitcoinme-token/
├── contracts/
│   └── BitCoinMe.sol          # Contrat principal
├── scripts/
│   ├── deploy.ts              # Script de déploiement
│   └── verify.ts              # Script de vérification
├── test/
│   └── BitCoinMe.test.ts      # Suite de tests
├── hardhat.config.ts          # Configuration Hardhat
├── tsconfig.json              # Configuration TypeScript
├── package.json               # Dépendances
├── .env.example               # Exemple de configuration
├── .gitignore                 # Fichiers à ignorer
└── README.md                  # Ce fichier
```

## 🌐 Réseaux supportés

### BSC Testnet (ChainId: 97)
- RPC: https://data-seed-prebsc-1-s1.binance.org:8545
- Explorer: https://testnet.bscscan.com
- Faucet: https://testnet.binance.org/faucet-smart

### BSC Mainnet (ChainId: 56)
- RPC: https://bsc-dataseed.binance.org
- Explorer: https://bscscan.com
- ⚠️ Nécessite de vrais BNB!

## 🆘 Dépannage

### Erreur: "insufficient funds"
- Vérifiez que votre wallet a des BNB sur le testnet
- Utilisez un faucet pour obtenir des BNB gratuits

### Erreur lors de la vérification
- Attendez quelques minutes après le déploiement
- Vérifiez que votre clé API BscScan est correcte
- Le contrat peut déjà être vérifié

### Les tests échouent
- Exécutez `npm install` pour vérifier les dépendances
- Assurez-vous d'utiliser Node.js v18+

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues! N'hésitez pas à:
1. Fork le projet
2. Créer une branche pour votre feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## ⚠️ Disclaimer

Ce code est fourni à des fins éducatives et de démonstration. Effectuez un audit de sécurité complet avant tout déploiement en production avec de vraies valeurs.