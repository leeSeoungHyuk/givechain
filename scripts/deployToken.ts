import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const [deployer] = await ethers.getSigners();
  const GiveToken = await ethers.getContractFactory("GiveToken");
  const initialSupply = ethers.parseUnits("100000", 18);
  const token = await GiveToken.deploy(initialSupply);
  await token.waitForDeployment();

  console.log("Deployer:", await deployer.getAddress());
  console.log("GiveToken:", await token.getAddress());
  console.log("Name:", await token.getFunction("name")());
  console.log("Symbol:", await token.getFunction("symbol")());
  console.log("Total Supply:", ethers.formatUnits(await token.getFunction("totalSupply")(), 18), "GVT");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
