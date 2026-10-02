// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Chainlink Keystone Forwarder consumer interface.
interface IReceiver {
    function onReport(bytes calldata metadata, bytes calldata report) external;
}
