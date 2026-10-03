// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Dual-exit escrow: release via registry report, or reclaim after grace period.
contract P2PEscrow {
    using SafeERC20 for IERC20;

    uint256 public immutable gracePeriod;

    address public gateway;
    address public registry;

    struct Payment {
        address payer;
        address token;
        uint256 amount;
        uint64 lockedAt;
        bool settled;
        bool reclaimed;
    }

    mapping(bytes32 => Payment) public payments;

    error UnauthorizedCaller();
    error PaymentAlreadyExists();
    error PaymentNotFound();
    error PaymentAlreadySettled();
    error PaymentAlreadyReclaimed();
    error TimelockNotExpired();
    error ZeroAddress();
    error ZeroAmount();

    event FundsLocked(
        bytes32 indexed paymentId, address indexed payer, address token, uint256 amount, uint64 lockedAt
    );
    event FundsReleased(bytes32 indexed paymentId, address indexed recipient, uint256 amount);
    event FundsReclaimed(bytes32 indexed paymentId, address indexed payer, uint256 amount);

    modifier onlyGateway() {
        if (msg.sender != gateway) revert UnauthorizedCaller();
        _;
    }

    modifier onlyRegistry() {
        if (msg.sender != registry) revert UnauthorizedCaller();
        _;
    }

    constructor(uint256 gracePeriod_) {
        gracePeriod = gracePeriod_;
    }

    function setGateway(address gateway_) external {
        if (gateway != address(0)) revert UnauthorizedCaller();
        if (gateway_ == address(0)) revert ZeroAddress();
        gateway = gateway_;
    }

    function setRegistry(address registry_) external {
        if (registry != address(0)) revert UnauthorizedCaller();
        if (registry_ == address(0)) revert ZeroAddress();
        registry = registry_;
    }

    function lockFunds(bytes32 paymentId, address payer, address token, uint256 amount) external onlyGateway {
        if (payer == address(0) || token == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (payments[paymentId].payer != address(0)) revert PaymentAlreadyExists();

        payments[paymentId] = Payment({
            payer: payer,
            token: token,
            amount: amount,
            lockedAt: uint64(block.timestamp),
            settled: false,
            reclaimed: false
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit FundsLocked(paymentId, payer, token, amount, uint64(block.timestamp));
    }

    function releaseFunds(bytes32 paymentId, address recipient) external onlyRegistry {
        if (recipient == address(0)) revert ZeroAddress();
        Payment storage p = payments[paymentId];
        if (p.payer == address(0)) revert PaymentNotFound();
        if (p.settled) revert PaymentAlreadySettled();
        if (p.reclaimed) revert PaymentAlreadyReclaimed();

        p.settled = true;
        uint256 amount = p.amount;
        IERC20(p.token).safeTransfer(recipient, amount);
        emit FundsReleased(paymentId, recipient, amount);
    }

    function reclaimFunds(bytes32 paymentId) external {
        Payment storage p = payments[paymentId];
        if (p.payer == address(0)) revert PaymentNotFound();
        if (p.settled) revert PaymentAlreadySettled();
        if (p.reclaimed) revert PaymentAlreadyReclaimed();
        if (block.timestamp < uint256(p.lockedAt) + gracePeriod) revert TimelockNotExpired();

        p.reclaimed = true;
        uint256 amount = p.amount;
        address payer = p.payer;
        IERC20(p.token).safeTransfer(payer, amount);
        emit FundsReclaimed(paymentId, payer, amount);
    }
}
