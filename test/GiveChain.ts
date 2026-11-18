import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();
const ether = (value: string) => ethers.parseEther(value);

describe("GiveChain", function () {
  let giveChain: any;
  let owner: any;
  let beneficiaryA: any;
  let beneficiaryB: any;
  let donorA: any;
  let donorB: any;
  let attacker: any;

  beforeEach(async function () {
    [owner, beneficiaryA, beneficiaryB, donorA, donorB, attacker] = await ethers.getSigners();
    const GiveChain = await ethers.getContractFactory("GiveChain");
    giveChain = await GiveChain.deploy();
    await giveChain.waitForDeployment();
  });

  it("sets the deployer as owner and starts with no campaigns", async function () {
    expect(await giveChain.getFunction("owner")()).to.equal(await owner.getAddress());
    expect(await giveChain.getFunction("campaignCount")()).to.equal(0n);
  });

  it("stores each field when a campaign is created", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    const campaign = await giveChain.getFunction("campaigns")(0);
    expect(campaign.owner).to.equal(await owner.getAddress());
    expect(campaign.title).to.equal("Education");
    expect(campaign.goal).to.equal(ether("5"));
    expect(campaign.raised).to.equal(0n);
    expect(campaign.beneficiary).to.equal(await beneficiaryA.getAddress());
    expect(campaign.stage).to.equal(1n);
    expect(await giveChain.getFunction("campaignCount")()).to.equal(1n);
  });

  it("keeps campaign records independent", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.getFunction("createCampaign")("Health", ether("3"), await beneficiaryB.getAddress());
    expect((await giveChain.getFunction("campaigns")(0)).title).to.equal("Education");
    expect((await giveChain.getFunction("campaigns")(1)).title).to.equal("Health");
    expect((await giveChain.getFunction("campaigns")(0)).beneficiary).to.equal(await beneficiaryA.getAddress());
    expect((await giveChain.getFunction("campaigns")(1)).beneficiary).to.equal(await beneficiaryB.getAddress());
  });

  it("accumulates repeated donations in the campaign and donor ledgers", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("0.5") });
    expect((await giveChain.getFunction("campaigns")(0)).raised).to.equal(ether("1.5"));
    expect(await giveChain.getFunction("donations")(0, await donorA.getAddress())).to.equal(ether("1.5"));
    expect(await giveChain.getFunction("totalDonated")()).to.equal(ether("1.5"));
  });

  it("rejects a zero-value donation", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await expect(giveChain.connect(donorA).getFunction("donate")(0)).to.be.revertedWithCustomError(giveChain, "InvalidDonation");
  });

  it("marks a campaign successful when it reaches its goal", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("1"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.getFunction("finalizeCampaign")(0);
    expect((await giveChain.getFunction("campaigns")(0)).stage).to.equal(2n);
  });

  it("marks a campaign failed when it misses its goal", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.getFunction("finalizeCampaign")(0);
    expect((await giveChain.getFunction("campaigns")(0)).stage).to.equal(3n);
  });

  it("restricts campaign finalization to the owner", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await expect(giveChain.connect(donorA).getFunction("finalizeCampaign")(0)).to.be.revertedWithCustomError(giveChain, "OnlyOwner");
  });

  it("restricts successful withdrawals to the beneficiary", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("1"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.getFunction("finalizeCampaign")(0);
    await expect(giveChain.connect(attacker).getFunction("withdraw")(0)).to.be.revertedWithCustomError(giveChain, "OnlyBeneficiary");
  });

  it("withdraws only the selected campaign's funds", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("1"), await beneficiaryA.getAddress());
    await giveChain.getFunction("createCampaign")("Health", ether("2"), await beneficiaryB.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.connect(donorB).getFunction("donate")(1, { value: ether("2") });
    await giveChain.getFunction("finalizeCampaign")(0);
    await giveChain.getFunction("finalizeCampaign")(1);
    await giveChain.connect(beneficiaryA).getFunction("withdraw")(0);
    expect(await ethers.provider.getBalance(await giveChain.getAddress())).to.equal(ether("2"));
  });

  it("refunds a donor after a failed campaign", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.getFunction("finalizeCampaign")(0);
    await giveChain.connect(donorA).getFunction("refund")(0);
    expect(await giveChain.getFunction("donations")(0, await donorA.getAddress())).to.equal(0n);
  });

  it("prevents a donor from claiming the same refund twice", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await giveChain.getFunction("finalizeCampaign")(0);
    await giveChain.connect(donorA).getFunction("refund")(0);
    await expect(giveChain.connect(donorA).getFunction("refund")(0)).to.be.revertedWithCustomError(giveChain, "NoDonation");
  });

  it("emits the donor, campaign, and amount in the Donated event", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await expect(giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") }))
      .to.emit(giveChain, "Donated")
      .withArgs(0n, await donorA.getAddress(), ether("1"));
  });

  it("allows the owner to update the beneficiary before donations", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.getFunction("changeBeneficiary")(0, await beneficiaryB.getAddress());
    expect((await giveChain.getFunction("campaigns")(0)).beneficiary).to.equal(await beneficiaryB.getAddress());
  });

  it("rejects changing a beneficiary after donations begin", async function () {
    await giveChain.getFunction("createCampaign")("Education", ether("5"), await beneficiaryA.getAddress());
    await giveChain.connect(donorA).getFunction("donate")(0, { value: ether("1") });
    await expect(giveChain.getFunction("changeBeneficiary")(0, await beneficiaryB.getAddress()))
      .to.be.revertedWithCustomError(giveChain, "CampaignHasDonation");
  });
});
