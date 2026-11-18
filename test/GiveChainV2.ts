import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();
const units = (amount: string) => ethers.parseUnits(amount, 18);

describe("GiveChainV2", function () {
  let token: any;
  let chain: any;
  let owner: any;
  let donor: any;
  let beneficiary: any;
  let attacker: any;

  beforeEach(async function () {
    [owner, donor, beneficiary, attacker] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("GiveTokenV2");
    token = await Token.deploy(await owner.getAddress());
    await token.waitForDeployment();
    const GiveChainV2 = await ethers.getContractFactory("GiveChainV2");
    chain = await GiveChainV2.deploy();
    await chain.waitForDeployment();
  });

  async function createTokenCampaign(goal = "500") {
    await chain.getFunction("createCampaign")(
      "Education",
      units(goal),
      await beneficiary.getAddress(),
      await token.getAddress(),
    );
  }

  it("mints charge tokens only when the owner calls it", async function () {
    await token.getFunction("mintForCharge")(await donor.getAddress(), units("100"));
    expect(await token.getFunction("balanceOf")(await donor.getAddress())).to.equal(units("100"));
    await expect(token.connect(donor).getFunction("mintForCharge")(await donor.getAddress(), 1n))
      .to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("rejects token donations without approval", async function () {
    await createTokenCampaign();
    await token.getFunction("mintForCharge")(await donor.getAddress(), units("100"));
    await expect(chain.connect(donor).getFunction("donateToken")(0, units("100"))).to.be.reverted;
  });

  it("records an approved token donation in the campaign and donor ledgers", async function () {
    await createTokenCampaign();
    await token.getFunction("mintForCharge")(await donor.getAddress(), units("100"));
    await token.connect(donor).getFunction("approve")(await chain.getAddress(), units("100"));
    await chain.connect(donor).getFunction("donateToken")(0, units("100"));

    expect((await chain.getFunction("campaigns")(0)).raised).to.equal(units("100"));
    expect(await chain.getFunction("donations")(0, await donor.getAddress())).to.equal(units("100"));
    expect(await token.getFunction("balanceOf")(await chain.getAddress())).to.equal(units("100"));
  });

  it("pays the beneficiary after a successful token campaign", async function () {
    await createTokenCampaign("100");
    await token.getFunction("mintForCharge")(await donor.getAddress(), units("100"));
    await token.connect(donor).getFunction("approve")(await chain.getAddress(), units("100"));
    await chain.connect(donor).getFunction("donateToken")(0, units("100"));
    await chain.getFunction("finalizeCampaign")(0);
    await chain.connect(beneficiary).getFunction("withdraw")(0);

    expect(await token.getFunction("balanceOf")(await beneficiary.getAddress())).to.equal(units("100"));
    expect(await token.getFunction("balanceOf")(await chain.getAddress())).to.equal(0n);
  });

  it("returns only the donor's token contribution after a failed campaign", async function () {
    await createTokenCampaign("500");
    await token.getFunction("mintForCharge")(await donor.getAddress(), units("100"));
    await token.connect(donor).getFunction("approve")(await chain.getAddress(), units("100"));
    await chain.connect(donor).getFunction("donateToken")(0, units("100"));
    await chain.getFunction("finalizeCampaign")(0);
    await chain.connect(donor).getFunction("refund")(0);

    expect(await token.getFunction("balanceOf")(await donor.getAddress())).to.equal(units("100"));
    expect(await chain.getFunction("donations")(0, await donor.getAddress())).to.equal(0n);
  });

  it("preserves ETH campaign donations alongside token campaigns", async function () {
    await createTokenCampaign();
    await chain.getFunction("createCampaign")("Local ETH", ethers.parseEther("1"), await beneficiary.getAddress(), ethers.ZeroAddress);
    await chain.connect(donor).getFunction("donate")(1, { value: ethers.parseEther("1") });
    await expect(chain.connect(donor).getFunction("donateToken")(1, units("1"))).to.be.revertedWithCustomError(chain, "WrongAsset");
    expect(await chain.getFunction("getContractAssetBalance")(ethers.ZeroAddress)).to.equal(ethers.parseEther("1"));
  });

  it("restricts token campaign finalization to the owner", async function () {
    await createTokenCampaign();
    await expect(chain.connect(attacker).getFunction("finalizeCampaign")(0)).to.be.revertedWithCustomError(chain, "OnlyOwner");
  });
});
