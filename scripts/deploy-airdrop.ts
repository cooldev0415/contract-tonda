import { ethers, run } from "hardhat";

async function main() {
  // First, get the deployed token address
  const tokenAddress = "REPLACE_WITH_DEPLOYED_TOKEN_ADDRESS"; // Replace with your deployed token address
  const airdropAmount = ethers.parseEther("100"); // 100 tokens per user

  console.log("Deploying Tonda Airdrop...");

  const TondaAirdrop = await ethers.getContractFactory("TondaAirdrop");
  const airdrop = await TondaAirdrop.deploy(tokenAddress, airdropAmount);

  await airdrop.waitForDeployment();

  const address = await airdrop.getAddress();
  console.log(`Tonda Airdrop deployed to: ${address}`);

  // Verify the contract on BscScan
  console.log("Waiting for block confirmations...");
  await airdrop.deploymentTransaction()?.wait(6);
  
  console.log("Verifying contract...");
  await run("verify:verify", {
    address: address,
    constructorArguments: [tokenAddress, airdropAmount],
  });

  console.log("Contract verified!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 