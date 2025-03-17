import { ethers, run } from "hardhat";

async function main() {
  console.log("Deploying Tonda Airdrop...");

  // Get the TondaToken address
  const tokenAddress = "0xf193272bb87a0A8426Eb5922a40193e8B7A17EeD"; // The address of the deployed TondaToken
  
  // Set token per point value (1 token per point)
  const tokenPerPoint = ethers.parseEther("1");

  // Deploy the airdrop contract
  const TondaAirdrop = await ethers.getContractFactory("TondaAirdrop");
  const airdrop = await TondaAirdrop.deploy(tokenAddress, tokenPerPoint);

  await airdrop.waitForDeployment();

  const address = await airdrop.getAddress();
  console.log(`Tonda Airdrop deployed to: ${address}`);

  // Verify the contract on BscScan
  console.log("Waiting for block confirmations...");
  await airdrop.deploymentTransaction()?.wait(6);
  
  console.log("Verifying contract...");
  await run("verify:verify", {
    address: address,
    constructorArguments: [tokenAddress, tokenPerPoint],
  });

  console.log("Contract verified!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 