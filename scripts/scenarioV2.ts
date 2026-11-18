import { network } from "hardhat";

const { ethers } = await network.create();

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const chainAddress = process.env.GIVECHAIN_ADDRESS;
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) throw new Error("Set a valid TOKEN_ADDRESS");
  if (!chainAddress || !ethers.isAddress(chainAddress)) throw new Error("Set a valid GIVECHAIN_ADDRESS");

  const [owner, donor, beneficiary] = await ethers.getSigners();
  const donorAddress = await donor.getAddress();
  const beneficiaryAddress = await beneficiary.getAddress();
  const token = await ethers.getContractAt("GiveTokenV2", tokenAddress, owner);
  const chain = await ethers.getContractAt("GiveChainV2", chainAddress, owner);

  await (await chain.getFunction("createCampaign")("Education", ethers.parseUnits("500", 18), beneficiaryAddress, tokenAddress)).wait();
  await (await chain.getFunction("createCampaign")("Animal care", ethers.parseUnits("500", 18), beneficiaryAddress, tokenAddress)).wait();
  await (await token.getFunction("mintForCharge")(donorAddress, ethers.parseUnits("1000", 18))).wait();

  const donorToken = token.connect(donor);
  const donorChain = chain.connect(donor);
  await (await donorToken.getFunction("approve")(chainAddress, ethers.parseUnits("700", 18))).wait();
  await (await donorChain.getFunction("donateToken")(0, ethers.parseUnits("600", 18))).wait();
  await (await chain.getFunction("finalizeCampaign")(0)).wait();
  await (await chain.connect(beneficiary).getFunction("withdraw")(0)).wait();

  await (await donorChain.getFunction("donateToken")(1, ethers.parseUnits("100", 18))).wait();
  await (await chain.getFunction("finalizeCampaign")(1)).wait();
  await (await donorChain.getFunction("refund")(1)).wait();

  console.log("Donor balance:", ethers.formatUnits(await token.getFunction("balanceOf")(donorAddress), 18), "GVT");
  console.log("Beneficiary balance:", ethers.formatUnits(await token.getFunction("balanceOf")(beneficiaryAddress), 18), "GVT");
  console.log("GiveChain balance:", ethers.formatUnits(await token.getFunction("balanceOf")(chainAddress), 18), "GVT");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
