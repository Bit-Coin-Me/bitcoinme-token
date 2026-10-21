// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Generated from config/tokenomics.json. Run pnpm generate:tokenomics; do not edit.
/**
 * @title Tokenomics
 * @author Bit-Coin-Me contributors
 * @notice Fixed genesis constants generated from the reviewed tokenomics configuration.
 */
library Tokenomics {
    string internal constant NAME = unicode"Bịt Coin Mẹ!";
    string internal constant SYMBOL = "BCM";
    uint256 internal constant MAX_SUPPLY = 8888888888000000000000000000;

    function allocations() internal pure returns (uint256[8] memory) {
        return [
            uint256(444444444000000000000000000),
            311111111000000000000000000,
            311111111000000000000000000,
            311111111000000000000000000,
            311111111000000000000000000,
            355555556000000000000000000,
            355555556000000000000000000,
            6488888888000000000000000000
        ];
    }
}
