import { run } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("🔍 Vérification du contrat sur BscScan...\n");

  // Charger les informations de déploiement
  if (!fs.existsSync("deployment-info.json")) {
    console.error("❌ Fichier deployment-info.json introuvable!");
    console.error("Veuillez d'abord déployer le contrat avec: npm run deploy:testnet");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync("deployment-info.json", "utf8"));
  const { contractAddress, initialOwners } = deploymentInfo;

  console.log("📍 Adresse du contrat:", contractAddress);
  console.log("👥 Propriétaires initiaux:", initialOwners);
  console.log();

  try {
    console.log("⏳ Vérification en cours...");
    
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [initialOwners],
    });

    console.log("✅ Contrat vérifié avec succès sur BscScan!");
    console.log(`🔗 Voir sur BscScan: https://testnet.bscscan.com/address/${contractAddress}`);
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Le contrat est déjà vérifié sur BscScan");
      console.log(`🔗 Voir sur BscScan: https://testnet.bscscan.com/address/${contractAddress}`);
    } else {
      console.error("❌ Erreur lors de la vérification:", error);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Erreur:", error);
    process.exit(1);
  });