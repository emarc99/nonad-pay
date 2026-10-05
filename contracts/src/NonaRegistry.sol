// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC165} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import {IReceiver} from "./interfaces/IReceiver.sol";
import {P2PEscrow} from "./P2PEscrow.sol";
import {PhoneResolver} from "./PhoneResolver.sol";

/// @notice Receives CRE / Keystone reports and releases escrowed AUSD.
contract NonaRegistry is ERC165, IReceiver {
    address public keystoneForwarder;
    address public owner;
    P2PEscrow public escrow;
    PhoneResolver public resolver;

    mapping(bytes32 => bool) public settledNullifiers;
    mapping(bytes32 => bool) public processedPayments;

    error UnauthorizedForwarder(address caller);
    error UnauthorizedCaller();
    error PaymentAlreadyProcessed();
    error NullifierAlreadySpent();
    error InvalidEnclaveReport();
    error RecipientUnresolved();
    error ZeroAddress();

    event PaymentSettled(
        bytes32 indexed paymentId, bytes32 indexed nullifier, address recipient, uint8 tier, uint256 amount
    );
    event ForwarderUpdated(address indexed forwarder);
    event RejectedReport(bytes32 indexed paymentId, bytes32 indexed nullifier, string reason);

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller();
        _;
    }

    constructor(address forwarder_, address escrow_, address resolver_) {
        if (escrow_ == address(0) || resolver_ == address(0)) revert ZeroAddress();
        owner = msg.sender;
        keystoneForwarder = forwarder_;
        escrow = P2PEscrow(escrow_);
        resolver = PhoneResolver(resolver_);
    }

    function setForwarder(address forwarder_) external onlyOwner {
        keystoneForwarder = forwarder_;
        emit ForwarderUpdated(forwarder_);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @dev Report ABI (must match CRE workflow byte-for-byte):
    /// (bytes32 paymentId, bytes32 nullifier, bytes32 recipientCommit, uint8 tier, uint64 expiry, bool approved)
    function onReport(bytes calldata, /* metadata */ bytes calldata report) external override {
        if (keystoneForwarder != address(0) && msg.sender != keystoneForwarder) {
            revert UnauthorizedForwarder(msg.sender);
        }

        (
            bytes32 paymentId,
            bytes32 nullifier,
            bytes32 recipientCommit,
            uint8 tier,
            uint64 expiry,
            bool approved
        ) = abi.decode(report, (bytes32, bytes32, bytes32, uint8, uint64, bool));

        if (processedPayments[paymentId]) revert PaymentAlreadyProcessed();
        processedPayments[paymentId] = true;

        if (!approved) {
            emit RejectedReport(paymentId, nullifier, "not approved");
            return;
        }
        if (block.timestamp > expiry) {
            emit RejectedReport(paymentId, nullifier, "expired");
            return;
        }
        if (settledNullifiers[nullifier]) revert NullifierAlreadySpent();

        address recipient = resolver.resolve(recipientCommit);
        if (recipient == address(0)) revert RecipientUnresolved();

        settledNullifiers[nullifier] = true;

        (,, uint256 amount,,,) = escrow.payments(paymentId);
        escrow.releaseFunds(paymentId, recipient);
        emit PaymentSettled(paymentId, nullifier, recipient, tier, amount);
    }

    function isNullifierSpent(bytes32 nullifier) external view returns (bool) {
        return settledNullifiers[nullifier];
    }

    /// @notice Test / simulation helper: encode report with exact ABI parity for CRE.
    function encodeReport(
        bytes32 paymentId,
        bytes32 nullifier,
        bytes32 recipientCommit,
        uint8 tier,
        uint64 expiry,
        bool approved
    ) external pure returns (bytes memory) {
        return abi.encode(paymentId, nullifier, recipientCommit, tier, expiry, approved);
    }
}
