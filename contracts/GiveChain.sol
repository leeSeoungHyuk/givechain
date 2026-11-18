// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title GiveChain
/// @notice ETH-only crowdfunding contract used in the CH06-CH07 exercises.
contract GiveChain {
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
        Stage stage;
        bool withdrawn;
        uint256 refunded;
    }

    address public owner;
    uint256 public campaignCount;
    uint256 public totalDonated;
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public donations;
    bool private locked;

    error OnlyOwner();
    error InvalidCampaign();
    error InvalidBeneficiary();
    error InvalidGoal();
    error InvalidDonation();
    error InvalidStage();
    error OnlyBeneficiary();
    error NoDonation();
    error AlreadyWithdrawn();
    error CampaignHasDonation();
    error ReentrantCall();
    error TransferFailed();

    event CampaignCreated(uint256 indexed campaignId, address indexed campaignOwner, string title, uint256 goal, address beneficiary);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event CampaignFinalized(uint256 indexed campaignId, Stage stage, uint256 raised);
    event Withdrawn(uint256 indexed campaignId, address indexed beneficiary, uint256 amount);
    event Refunded(uint256 indexed campaignId, address indexed donor, uint256 amount);
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

    function createCampaign(string calldata title, uint256 goal, address payable beneficiary)
        external
        onlyOwner
        returns (uint256 campaignId)
    {
        if (bytes(title).length == 0) revert InvalidCampaign();
        if (goal == 0) revert InvalidGoal();
        if (beneficiary == address(0)) revert InvalidBeneficiary();

        campaignId = campaignCount++;
        campaigns[campaignId] = Campaign({
            owner: msg.sender,
            title: title,
            goal: goal,
            raised: 0,
            beneficiary: beneficiary,
            stage: Stage.OPEN,
            withdrawn: false,
            refunded: 0
        });
        emit CampaignCreated(campaignId, msg.sender, title, goal, beneficiary);
    }

    function donate(uint256 campaignId) external payable validCampaign(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.OPEN) revert InvalidStage();
        if (msg.value == 0) revert InvalidDonation();

        campaign.raised += msg.value;
        donations[campaignId][msg.sender] += msg.value;
        totalDonated += msg.value;
        emit Donated(campaignId, msg.sender, msg.value);
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
        (bool success,) = campaign.beneficiary.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Withdrawn(campaignId, campaign.beneficiary, amount);
    }

    function refund(uint256 campaignId) external validCampaign(campaignId) nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.stage != Stage.FAILED) revert InvalidStage();
        uint256 amount = donations[campaignId][msg.sender];
        if (amount == 0) revert NoDonation();

        donations[campaignId][msg.sender] = 0;
        campaign.refunded += amount;
        (bool success,) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Refunded(campaignId, msg.sender, amount);
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

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
