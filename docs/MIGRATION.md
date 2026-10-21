# Migration du token BCM

## Périmètre réalisé

La migration MB-1 retire les rôles et toute création après le constructeur. Le burn utilise `ERC20Burnable`. Le constructeur accepte huit contrats destinataires distincts, dans l'ordre de `config/tokenomics.json`, et attribue chaque montant fixé par ce fichier. Le déployeur, les EOA, les doublons et l'adresse zéro sont refusés.

Les tests MB-2 de l'ancienne administration et du remint sont remplacés par la spécification cible : métadonnées NFC, distribution exacte, ABI fermée, erreurs ERC-20 précises, autorisations de burn, appels aux anciens sélecteurs refusés et invariants sur mille opérations à graine fixe. Les comportements ERC-20 précédemment testés restent couverts.

Les destinataires des fixtures locales sont des contrats de test sans politique de garde. Ils ne constituent aucune preuve de Safe ou de vesting.

## Décisions encore requises

Le modèle A et les allocations du §3 d'AGENTS.md servent de base provisoire. `config/launch-plan.json` enregistre les décisions non prises.

Les mainteneurs doivent définir les buckets et fractions verrouillés, les dates, la signification du cliff, la durée de libération, les bénéficiaires, la politique de la trésorerie, les signataires et le seuil du Safe. La conservation de huit buckets dans le token n'impose pas une seule adresse bénéficiaire finale à un contrat de distribution de trésorerie : sa politique reste à concevoir et à revoir.

Les vestings OpenZeppelin standards permettent de transférer leur propriété. Leur simple utilisation ne prouve donc pas l'immuabilité du bénéficiaire. Voir la [documentation officielle](https://docs.openzeppelin.com/contracts/5.x/api/finance).

Les fonctions de lancement et le module Ignition refusent de déployer tant que cette partie manque. Modifier seulement le champ `status` ne suffit pas à lever le blocage. Aucun déploiement n'a été effectué dans cette migration.

## Vérification des engagements

`verify:claims` contrôle le réseau, le bytecode complet comparé au build local, la transaction de création, ses arguments, les événements de distribution, les métadonnées et le plafond du supply. Les lectures courantes utilisent un même numéro de bloc.

Les engagements relatifs aux locks, au Safe et aux LP restent explicitement non vérifiés. Le script renvoie un code d'échec et `fullyVerified: false` tant qu'ils ne sont pas implémentés. Les preuves on-chain doivent être revérifiées après finalisation des transactions.

Il reste à écrire les tests de vesting et la répétition sur fork à bloc fixé, avec achat, vente et traitement des LP. Les adresses des contrats externes doivent provenir de sources officielles puis être vérifiées on-chain. Les agents n'accèdent pas au mainnet.

## Build et dépendances

Solidity est épinglé à la version exacte du projet, avec les réglages EVM et optimizer existants. Le package solcjs épinglé est exécuté directement sur musl et dans la CI. Aucun fichier d'environnement n'est chargé par Hardhat.

pnpm est le gestionnaire par défaut retenu pour cette préparation. Le lockfile npm concurrent et les anciens rapports générés ont été retirés. Les dépendances directes sont épinglées ; les overrides pnpm corrigent les avis de sécurité des dépendances transitives. Certaines corrections changent leur version majeure : les tests du projet doivent rester verts et les chemins de déploiement doivent être revus avant activation.

La CI vérifie compilation, tests, couverture complète, style, AST/ABI, hash du bytecode, Slither, dépendances et secrets. Une exécution distante réussie et la comparaison de son bytecode avec le build local restent nécessaires.

Au 4 octobre 2026, `pnpm audit` signale encore trois alertes dans les outils :

| Dépendance                   | Sévérité | Avis                                                                     |
| ---------------------------- | -------- | ------------------------------------------------------------------------ |
| `braces@3.0.3`               | Haute    | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) |
| `http-cache-semantics@4.2.0` | Haute    | [GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp) |
| `elliptic@6.6.1`             | Faible   | [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) |

Les versions corrigées indiquées par ces avis ne sont pas publiées sur le registre npm au moment du contrôle. Aucune alerte n'est ignorée : l'étape d'audit bloque la CI tant que ces dépendances restent vulnérables. Le contrôle de mise à jour automatique de Solhint est désactivé ; cela réduit les appels réseau sans constituer une correction de sa dépendance. Ces alertes concernent l'environnement de développement et doivent être résolues avant la release.

## Résultats locaux du 4 octobre 2026

- Installation avec lockfile figé et compilation : réussies.
- TypeScript, Solhint et Prettier : réussis.
- 36 tests réussis, dont 1 000 opérations pseudo-aléatoires avec conservation des soldes et supply jamais croissant.
- Couverture de `contracts/` : 100 % des lignes, branches, fonctions et instructions.
- Contrôle AST/ABI et cohérence des constantes générées : réussis.
- Slither sur le code du projet : aucun résultat haut ou moyen ; deux résultats informatifs `too-many-digits` sur les constantes générées, dont les sommes sont contrôlées par le générateur et les tests.
- Audit des dépendances : échec attendu, trois alertes non corrigées détaillées ci-dessus.
- CI distante et scan de secrets de la CI : non exécutés localement. Aucune preuve de release distante n'est acquise.

Le runtime compilé sans instrumentation a pour hash Keccak-256 `0x08baaf07bf6e97bc022129f97b1b7533d6f32dac6d370c8b9cec284baffcfdf6`. Il doit encore être comparé au résultat de la CI depuis le même commit.

## Conditions de release restantes

- Décisions OD-1 et OD-2 écrites et implémentation des contrôles économiques.
- Validation du choix pnpm et du chemin Ignition par les mainteneurs.
- Désignation des comptes CODEOWNERS et protection GitHub imposant deux approbations sur les chemins sensibles.
- Revue indépendante du contrat et des contrats de garde, puis gel de la release candidate.
- Tests sur fork et déploiement testnet depuis le même commit, avec preuves de source BscScan et Sourcify.
- Manifestes publics par réseau : adresses, transaction de création, arguments, Safe, locks et LP.
- Alignement du whitepaper et du site, qui sont hors du périmètre de ce dépôt.
- Déploiement mainnet par un humain avec portefeuille matériel, conformément à AGENTS.md.

Aucun contrôle local ne remplace ces preuves ou la revue indépendante.
