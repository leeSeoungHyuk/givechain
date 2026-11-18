// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title GiveChainV2
/// @notice Multi-campaign crowdfunding for native ETH and ERC-20 assets.
contract GiveChainV2 {
    using SafeERC20 for IERC20;

    enum Stage {
        NONE,
        OPEN,
        SUCCESS,
        FAILED
    }

    struct Campaign {
        address owner;
        string title;
        uint256 goal;
        uint256 raised;
        address payable beneficiary;
        address asset; // address(0) means native ETH.
        Stage stage;
        bool withdrawn;
        uint256 refunded;
    }

    address public owner;
    uint256 public campaignCount;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations;
    mapping(address => uint256) public lifetimeDonatedByAsset;
    bool private locked;

    error OnlyOwner();
    error InvalidCampaign();
    error InvalidBeneficiary();
    error InvalidGoal();
    error InvalidDonation();
    error InvalidStage();
    error InvalidAsset();
    error WrongAsset();
    error OnlyBeneficiary();
    error NoDonation();
    error AlreadyWithdrawn();
    error CampaignHasDonation();
    error ReentrantCall();
    error TransferFailed();

    event CampaignCreated(uint256 indexed campaignId, address indexed campaignOwner, string title, uint256 goal, address beneficiary, address asset);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignFinalized(uint256 indexed campaignId, Stage stage, uint256 raised);
    event Withdrawn(uint256 indexed campaignId, address indexed beneficiary, address asset, uint256 amount);
    event Refunded(uint256 indexed campaignId, address indexed donor, address asset, uint256 amount);
    event BeneficiaryChanged(uint256 indexed campaignId, address indexed oldBeneficiary, address indexed newBeneficiary);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier validCampaign(uint256 campaignId) {
        if (campaignId >= campaignCount) revert InvalidCampaign();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert ReentrantCall();
        locked = true;
        _;
        locked = false;
    }

    function createCampaign(string calldata title, uint256 goal, address payable beneficiary, address asset)
        external
        onlyOwner
        returns (uint256 campaignId)
    {
        if (bytes(title).length == 0) revert InvalidCampaign();
        if (goal == 0) revert InvalidGoal();
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (asset != address(0) && asset.code.length == 0) revert InvalidAsset();

        campaignId = campaignCount++;
        campaigns[campaignId] = Campaign({
            owner: msg.sender,
            title: title,
            goal: goal,
            raised: 0,
            beneficiary: beneficiary,
            asset: asset,
            stage: Stage.OPEN,
            withdrawn: false,
            refunded: 0
        });
        emit CampaignCreated(campaignId, msg.sender, title, goal, beneficiary, asset);
    }

    function donate(uint256 campaignId) external payable validCampaign(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.OPEN) revert InvalidStage();
        if (campaign.asset != address(0)) revert WrongAsset();
        if (msg.value == 0) revert InvalidDonation();
        _recordDonation(campaignId, msg.sender, msg.value);
    }

    function donateToken(uint256 campaignId, uint256 amount) external validCampaign(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.OPEN) revert InvalidStage();
        if (campaign.asset == address(0)) revert WrongAsset();
        if (amount == 0) revert InvalidDonation();

        IERC20 token = IERC20(campaign.asset);
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = token.balanceOf(address(this)) - beforeBalance;
        if (received == 0) revert InvalidDonation();
        _recordDonation(campaignId, msg.sender, received);
    }

    function finalizeCampaign(uint256 campaignId) external onlyOwner validCampaign(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.OPEN) revert InvalidStage();
        campaign.stage = campaign.raised >= campaign.goal ? Stage.SUCCESS : Stage.FAILED;
        emit CampaignFinalized(campaignId, campaign.stage, campaign.raised);
    }

    function withdraw(uint256 campaignId) external validCampaign(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.SUCCESS) revert InvalidStage();
        if (msg.sender != campaign.beneficiary) revert OnlyBeneficiary();
        if (campaign.withdrawn) revert AlreadyWithdrawn();

        campaign.withdrawn = true;
        uint256 amount = campaign.raised;
        _payout(campaign.asset, campaign.beneficiary, amount);
        emit Withdrawn(campaignId, campaign.beneficiary, campaign.asset, amount);
    }

    function refund(uint256 campaignId) external validCampaign(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.FAILED) revert InvalidStage();
        uint256 amount = donations[campaignId][msg.sender];
        if (amount == 0) revert NoDonation();

        donations[campaignId][msg.sender] = 0;
        campaign.refunded += amount;
        _payout(campaign.asset, payable(msg.sender), amount);
        emit Refunded(campaignId, msg.sender, campaign.asset, amount);
    }

    function changeBeneficiary(uint256 campaignId, address payable newBeneficiary)
        external
        onlyOwner
        validCampaign(campaignId)
    {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.OPEN) revert InvalidStage();
        if (campaign.raised != 0) revert CampaignHasDonation();
        if (newBeneficiary == address(0)) revert InvalidBeneficiary();

        address oldBeneficiary = campaign.beneficiary;
        campaign.beneficiary = newBeneficiary;
        emit BeneficiaryChanged(campaignId, oldBeneficiary, newBeneficiary);
    }

    function getMyDonation(uint256 campaignId) external view validCampaign(campaignId) returns (uint256) {
        return donations[campaignId][msg.sender];
    }

    function getCampaignRaised(uint256 campaignId) external view validCampaign(campaignId) returns (uint256) {
        return campaigns[campaignId].raised;
    }

    function getContractAssetBalance(address asset) external view returns (uint256) {
        return _assetBalance(asset);
    }

    function _recordDonation(uint256 campaignId, address donor, uint256 amount) internal {
        Campaign storage campaign = campaigns[campaignId];
        campaign.raised += amount;
        donations[campaignId][donor] += amount;
        lifetimeDonatedByAsset[campaign.asset] += amount;
        emit Donated(campaignId, donor, amount);
    }

    function _payout(address asset, address payable receiver, uint256 amount) internal {
        if (asset == address(0)) {
            (bool success,) = receiver.call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(asset).safeTransfer(receiver, amount);
        }
    }

    function _assetBalance(address asset) internal view returns (uint256) {
        return asset == address(0) ? address(this).balance : IERC20(asset).balanceOf(address(this));
    }
}
