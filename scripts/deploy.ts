import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Démarrage du déploiement du token BitCoinMe (BCM)...\n");

  // Récupérer le déployeur
  const [deployer] = await ethers.getSigners();
  console.log("📍 Déploiement avec le compte:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Solde du compte:", ethers.formatEther(balance), "BNB\n");

  // Liste des propriétaires initiaux (incluant le déployeur)
  // IMPORTANT: Modifiez ces adresses selon vos besoins
  const initialOwners: string[] = [
    deployer.address, // Le déployeur est automatiquement propriétaire
    // Ajoutez d'autres adresses ici:
    // "0x...",
    // "0x...",
  ];

  console.log("👥 Propriétaires initiaux:");
  initialOwners.forEach((owner, index) => {
    console.log(`   ${index + 1}. ${owner}`);
  });
  console.log();

  // Déployer le contrat
  console.log("⏳ Déploiement du contrat en cours...");
  const BitCoinMe = await ethers.getContractFactory("BitCoinMe");
  const bcm = await BitCoinMe.deploy(initialOwners);
  
  await bcm.waitForDeployment();
  const contractAddress = await bcm.getAddress();

  console.log("✅ Token BitCoinMe déployé à l'adresse:", contractAddress);
  console.log();

  // Vérifier les informations du token
  const name = await bcm.name();
  const symbol = await bcm.symbol();
  const decimals = await bcm.decimals();
  const totalSupply = await bcm.totalSupply();
  const maxSupply = await bcm.MAX_SUPPLY();
  const remainingSupply = await bcm.remainingMintableSupply();

  console.log("📊 Informations du token:");
  console.log("   Nom:", name);
  console.log("   Symbole:", symbol);
  console.log("   Décimales:", decimals.toString());
  console.log("   Supply initial:", ethers.formatEther(totalSupply), symbol);
  console.log("   Supply maximum:", ethers.formatEther(maxSupply), symbol);
  console.log("   Supply mintable restant:", ethers.formatEther(remainingSupply), symbol);
  console.log();

  // Vérifier les rôles
  console.log("🔑 Vérification des rôles:");
  for (const owner of initialOwners) {
    const isOwner = await bcm.isOwner(owner);
    const hasMinterRole = await bcm.hasRole(await bcm.MINTER_ROLE(), owner);
    console.log(`   ${owner}:`);
    console.log(`      - Est propriétaire: ${isOwner}`);
    console.log(`      - Peut minter: ${hasMinterRole}`);
  }
  console.log();

  console.log("📝 Résumé du déploiement:");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Adresse du contrat:", contractAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("ChainId:", (await ethers.provider.getNetwork()).chainId.toString());
  console.log("═══════════════════════════════════════════════════════════");
  console.log();

  console.log("🔍 Pour vérifier le contrat sur BscScan:");
  console.log(`npx hardhat verify --network bscTestnet ${contractAddress} '${JSON.stringify(initialOwners)}'`);
  console.log();

  console.log("💾 Sauvegardez ces informations:");
  console.log({
    contractAddress,
    deployer: deployer.address,
    initialOwners,
    network: "BSC Testnet",
    chainId: 97,
    timestamp: new Date().toISOString(),
  });

  // Sauvegarder l'adresse dans un fichier
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    initialOwners,
    network: "BSC Testnet",
    chainId: 97,
    timestamp: new Date().toISOString(),
    tokenInfo: {
      name,
      symbol,
      decimals: decimals.toString(),
      initialSupply: ethers.formatEther(totalSupply),
      maxSupply: ethers.formatEther(maxSupply),
    },
  };

  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n✅ Informations de déploiement sauvegardées dans deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur lors du déploiement:", error);
    process.exit(1);
  });