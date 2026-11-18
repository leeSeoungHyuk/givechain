import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying GiveChain...");
  console.log("Owner:", deployerAddress);

  const GiveChain = await ethers.getContractFactory("GiveChain");
  const giveChain = await GiveChain.deploy();
  await giveChain.waitForDeployment();

  const address = await giveChain.getAddress();
  console.log("GiveChain deployed to:", address);
  console.log("Contract owner:", await giveChain.getFunction("owner")());
  console.log("Campaign count:", await giveChain.getFunction("campaignCount")());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
