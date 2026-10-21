// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Tokenomics} from "./Tokenomics.sol";

/**
 * @title BitCoinMe
 * @author Bit-Coin-Me contributors
 * @notice Fixed genesis allocation with holder-authorized burns and standard ERC-20 transfers.
 */
contract BitCoinMe is ERC20, ERC20Burnable {
    /// @notice Total supply created at genesis; burns can only reduce the circulating total.
    uint256 public constant MAX_SUPPLY = Tokenomics.MAX_SUPPLY;

    /**
     * @notice Create the complete allocation directly in eight distinct recipient contracts.
     * @param recipients Founder, four team members, community, liquidity and treasury, in that order.
     * @dev Recipient code existence does not prove a Safe configuration or a vesting schedule.
     * Those properties must be independently verified before deployment.
     */
    constructor(address[8] memory recipients) ERC20(Tokenomics.NAME, Tokenomics.SYMBOL) {
        uint256[8] memory amounts = Tokenomics.allocations();
        for (uint256 i = 0; i < recipients.length; ++i) {
            address recipient = recipients[i];
            if (recipient == msg.sender || recipient.code.length == 0) {
                revert ERC20InvalidReceiver(recipient);
            }
            for (uint256 j = 0; j < i; ++j) {
                if (recipient == recipients[j]) {
                    revert ERC20InvalidReceiver(recipient);
                }
            }
            _mint(recipient, amounts[i]);
        }
    }
}
