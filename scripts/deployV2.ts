import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deployer:", deployerAddress);

  const GiveTokenV2 = await ethers.getContractFactory("GiveTokenV2");
  const token = await GiveTokenV2.deploy(deployerAddress);
  await token.waitForDeployment();

  const GiveChainV2 = await ethers.getContractFactory("GiveChainV2");
  const giveChain = await GiveChainV2.deploy();
  await giveChain.waitForDeployment();

  console.log("GiveTokenV2:", await token.getAddress());
  console.log("GiveChainV2:", await giveChain.getAddress());
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
