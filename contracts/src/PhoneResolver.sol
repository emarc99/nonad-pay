// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Maps opaque handle commitments to recipient addresses. No raw phone numbers on-chain.
contract PhoneResolver {
    mapping(bytes32 => address) public resolve;
    mapping(bytes32 => address) public ownerOf;

    error UnauthorizedCaller();
    error ZeroAddress();
    error HandleTaken();
    error HandleNotFound();

    event HandleRegistered(bytes32 indexed handleHash, address indexed recipient, address indexed owner);
    event HandleUpdated(bytes32 indexed handleHash, address indexed recipient);

    function registerHandle(bytes32 handleHash, address recipient) external {
        if (recipient == address(0)) revert ZeroAddress();
        if (ownerOf[handleHash] != address(0)) revert HandleTaken();
        ownerOf[handleHash] = msg.sender;
        resolve[handleHash] = recipient;
        emit HandleRegistered(handleHash, recipient, msg.sender);
    }

    function updateHandle(bytes32 handleHash, address recipient) external {
        if (ownerOf[handleHash] != msg.sender) revert UnauthorizedCaller();
        if (recipient == address(0)) revert ZeroAddress();
        resolve[handleHash] = recipient;
        emit HandleUpdated(handleHash, recipient);
    }
}
