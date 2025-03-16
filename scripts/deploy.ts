import { ethers, run } from "hardhat";

async function main() {
  console.log("Deploying Tonda Token...");

  // Initial supply of 1 million tokens with 18 decimals
  const initialSupply = ethers.parseEther("1000000");

  const TondaToken = await ethers.getContractFactory("TondaToken");
  const token = await TondaToken.deploy(initialSupply);

  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`Tonda Token deployed to: ${address}`);

  // Verify the contract on BscScan
  console.log("Waiting for block confirmations...");
  await token.deploymentTransaction()?.wait(6);
  
  console.log("Verifying contract...");
  await run("verify:verify", {
    address: address,
    constructorArguments: [initialSupply],
  });

  console.log("Contract verified!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 