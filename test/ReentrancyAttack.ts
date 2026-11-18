import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

describe("GiveChain refund reentrancy guard", function () {
  it("does not let a refund recipient claim twice during its receive callback", async function () {
    const [owner] = await ethers.getSigners();
    const GiveChain = await ethers.getContractFactory("GiveChain");
    const giveChain = await GiveChain.deploy();
    await giveChain.waitForDeployment();

    const RefundAttacker = await ethers.getContractFactory("RefundAttacker");
    const attacker = await RefundAttacker.deploy();
    await attacker.waitForDeployment();

    await giveChain.getFunction("createCampaign")("Failed campaign", ethers.parseEther("2"), await attacker.getAddress());
    await attacker.getFunction("donateToCampaign")(await giveChain.getAddress(), 0, { value: ethers.parseEther("1") });
    await giveChain.connect(owner).getFunction("finalizeCampaign")(0);
    await attacker.getFunction("attackRefund")();

    expect(await ethers.provider.getBalance(await attacker.getAddress())).to.equal(ethers.parseEther("1"));
    expect(await attacker.getFunction("reentryAttempts")()).to.equal(1n);
    expect(await giveChain.getFunction("donations")(0, await attacker.getAddress())).to.equal(0n);
  });
});
