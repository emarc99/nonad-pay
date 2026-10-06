// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IAUSD} from "./interfaces/IAUSD.sol";
import {P2PEscrow} from "./P2PEscrow.sol";

/// @notice User-facing payment entrypoint. Emits PaymentOpened for CRE log triggers.
contract NonaGateway {
    using SafeERC20 for IERC20;

    P2PEscrow public immutable escrow;
    address public immutable ausd;
    address public owner;

    uint256 public paymentCount;

    error UnauthorizedCaller();
    error ZeroAddress();
    error ZeroAmount();
    error UnsupportedToken();

    event PaymentOpened(
        bytes32 indexed paymentId,
        address indexed payer,
        bytes32 indexed recipientCommit,
        address token,
        uint256 amount,
        uint256 maxRiskScore,
        uint256 timestamp
    );

    constructor(address escrow_, address ausd_) {
        if (escrow_ == address(0) || ausd_ == address(0)) revert ZeroAddress();
        escrow = P2PEscrow(escrow_);
        ausd = ausd_;
        owner = msg.sender;
    }

    function openPayment(address token, uint256 amount, bytes32 recipientCommit, uint256 maxRiskScore)
        external
        returns (bytes32 paymentId)
    {
        return _open(msg.sender, token, amount, recipientCommit, maxRiskScore);
    }

    function openPaymentWithPermit(
        address token,
        uint256 amount,
        bytes32 recipientCommit,
        uint256 maxRiskScore,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (bytes32 paymentId) {
        if (token != ausd) revert UnsupportedToken();
        IAUSD(token).permit(msg.sender, address(this), amount, deadline, v, r, s);
        return _open(msg.sender, token, amount, recipientCommit, maxRiskScore);
    }

    function _open(address payer, address token, uint256 amount, bytes32 recipientCommit, uint256 maxRiskScore)
        internal
        returns (bytes32 paymentId)
    {
        if (token != ausd) revert UnsupportedToken();
        if (amount == 0) revert ZeroAmount();
        if (recipientCommit == bytes32(0)) revert ZeroAddress();

        paymentId = keccak256(abi.encodePacked(payer, recipientCommit, amount, ++paymentCount, block.timestamp));

        IERC20(token).safeTransferFrom(payer, address(this), amount);
        IERC20(token).forceApprove(address(escrow), amount);
        escrow.lockFunds(paymentId, payer, token, amount);

        emit PaymentOpened(paymentId, payer, recipientCommit, token, amount, maxRiskScore, block.timestamp);
    }
}
