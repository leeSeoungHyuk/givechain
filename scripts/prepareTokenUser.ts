import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const userAddress = process.env.USER_ADDRESS;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) throw new Error("Set a valid TOKEN_ADDRESS");
  if (!userAddress || !ethers.isAddress(userAddress)) throw new Error("Set a valid USER_ADDRESS");

  const [deployer] = await ethers.getSigners();
  await (await deployer.sendTransaction({ to: userAddress, value: ethers.parseEther("5") })).wait();
  const token = await ethers.getContractAt("GiveToken", tokenAddress, deployer);
  await (await token.getFunction("transfer")(userAddress, ethers.parseUnits("1000", 18))).wait();

  console.log("User:", userAddress);
  console.log("5 Local ETH sent");
  console.log("1000 GVT sent");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
