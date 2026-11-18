import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const userAddress = process.env.USER_ADDRESS;
  const chargeAmount = process.env.CHARGE_AMOUNT;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) throw new Error("Set a valid TOKEN_ADDRESS");
  if (!userAddress || !ethers.isAddress(userAddress)) throw new Error("Set a valid USER_ADDRESS");
  if (!chargeAmount || !/^\d+(\.\d+)?$/.test(chargeAmount)) throw new Error("Set a positive CHARGE_AMOUNT");

  const [operator] = await ethers.getSigners();
  const token = await ethers.getContractAt("GiveTokenV2", tokenAddress, operator);
  const decimals = Number(await token.getFunction("decimals")());
  const amount = ethers.parseUnits(chargeAmount, decimals);
  if (amount === 0n) throw new Error("CHARGE_AMOUNT must be greater than zero");

  await (await token.getFunction("mintForCharge")(userAddress, amount)).wait();
  const balance = await token.getFunction("balanceOf")(userAddress);
  console.log("User:", userAddress);
  console.log("Charge:", `${chargeAmount} GVT`);
  console.log("Balance:", `${ethers.formatUnits(balance, decimals)} GVT`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
