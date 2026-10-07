// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";

import {MockAUSD} from "../src/mocks/MockAUSD.sol";
import {P2PEscrow} from "../src/P2PEscrow.sol";
import {PhoneResolver} from "../src/PhoneResolver.sol";
import {NonaRegistry} from "../src/NonaRegistry.sol";
import {NonaGateway} from "../src/NonaGateway.sol";

contract NonaPayTest is Test {
    uint256 internal constant GRACE = 15 minutes;
    uint256 internal constant AMOUNT = 50e6;

    MockAUSD internal ausd;
    P2PEscrow internal escrow;
    PhoneResolver internal resolver;
    NonaRegistry internal registry;
    NonaGateway internal gateway;

    address internal forwarder = makeAddr("forwarder");
    address internal payer;
    uint256 internal payerKey;
    address internal recipient = makeAddr("recipient");
    bytes32 internal recipientCommit = keccak256("handle:amina");

    function setUp() public {
        (payer, payerKey) = makeAddrAndKey("payer");

        ausd = new MockAUSD();
        escrow = new P2PEscrow(GRACE);
        resolver = new PhoneResolver();
        registry = new NonaRegistry(forwarder, address(escrow), address(resolver));
        gateway = new NonaGateway(address(escrow), address(ausd));

        escrow.setGateway(address(gateway));
        escrow.setRegistry(address(registry));

        vm.prank(recipient);
        resolver.registerHandle(recipientCommit, recipient);

        ausd.mint(payer, 1_000e6);
    }

    function _open() internal returns (bytes32 paymentId) {
        vm.startPrank(payer);
        ausd.approve(address(gateway), AMOUNT);
        paymentId = gateway.openPayment(address(ausd), AMOUNT, recipientCommit, 50);
        vm.stopPrank();
    }

    function _report(bytes32 paymentId, bytes32 nullifier, bool approved) internal view returns (bytes memory) {
        // Encode locally so Foundry vm.prank is not consumed by a registry call.
        return abi.encode(
            paymentId, nullifier, recipientCommit, uint8(1), uint64(block.timestamp + 1 hours), approved
        );
    }

    function test_HappyPath_RemittanceSettlement() public {
        bytes32 paymentId = _open();
        assertEq(ausd.balanceOf(address(escrow)), AMOUNT);

        bytes32 nullifier = keccak256(abi.encodePacked("+2348012345678", address(gateway), bytes32("salt")));
        bytes memory report = _report(paymentId, nullifier, true);

        vm.prank(forwarder);
        registry.onReport("", report);

        assertEq(ausd.balanceOf(recipient), AMOUNT);
        assertEq(ausd.balanceOf(address(escrow)), 0);
        assertTrue(registry.isNullifierSpent(nullifier));
        assertTrue(registry.processedPayments(paymentId));

        vm.prank(forwarder);
        vm.expectRevert(NonaRegistry.PaymentAlreadyProcessed.selector);
        registry.onReport("", report);
    }

    function test_Reclaim_AfterTimeout() public {
        bytes32 paymentId = _open();

        vm.expectRevert(P2PEscrow.TimelockNotExpired.selector);
        escrow.reclaimFunds(paymentId);

        vm.warp(block.timestamp + GRACE + 1);
        escrow.reclaimFunds(paymentId);

        assertEq(ausd.balanceOf(payer), 1_000e6);
        assertEq(ausd.balanceOf(address(escrow)), 0);
    }

    function test_UnauthorizedReport_Reverts() public {
        bytes32 paymentId = _open();
        bytes memory report = _report(paymentId, keccak256("n1"), true);

        vm.expectRevert(abi.encodeWithSelector(NonaRegistry.UnauthorizedForwarder.selector, address(this)));
        registry.onReport("", report);
    }

    function test_Permit_GaslessDeposit() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = _permitDigest(payer, address(gateway), AMOUNT, ausd.nonces(payer), deadline);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerKey, digest);

        vm.prank(payer);
        bytes32 paymentId =
            gateway.openPaymentWithPermit(address(ausd), AMOUNT, recipientCommit, 10, deadline, v, r, s);

        assertEq(ausd.balanceOf(address(escrow)), AMOUNT);
        (address lockedPayer,,,,,) = escrow.payments(paymentId);
        assertEq(lockedPayer, payer);
    }

    function test_AbiParity_RoundTrip() public view {
        bytes32 paymentId = bytes32(uint256(1));
        bytes32 nullifier = bytes32(uint256(2));
        bytes memory encoded =
            registry.encodeReport(paymentId, nullifier, recipientCommit, 3, uint64(999), true);

        (
            bytes32 dPaymentId,
            bytes32 dNullifier,
            bytes32 dCommit,
            uint8 dTier,
            uint64 dExpiry,
            bool dApproved
        ) = abi.decode(encoded, (bytes32, bytes32, bytes32, uint8, uint64, bool));

        assertEq(dPaymentId, paymentId);
        assertEq(dNullifier, nullifier);
        assertEq(dCommit, recipientCommit);
        assertEq(dTier, 3);
        assertEq(dExpiry, 999);
        assertTrue(dApproved);
    }

    function test_NullifierDoubleSpend_Reverts() public {
        bytes32 paymentId1 = _open();
        bytes32 nullifier = keccak256("shared-nullifier");

        vm.prank(forwarder);
        registry.onReport("", _report(paymentId1, nullifier, true));

        bytes32 paymentId2 = _open();
        vm.prank(forwarder);
        vm.expectRevert(NonaRegistry.NullifierAlreadySpent.selector);
        registry.onReport("", _report(paymentId2, nullifier, true));
    }

    function test_RejectedReport_DoesNotRelease() public {
        bytes32 paymentId = _open();
        vm.prank(forwarder);
        registry.onReport("", _report(paymentId, keccak256("n"), false));
        assertEq(ausd.balanceOf(recipient), 0);
        assertEq(ausd.balanceOf(address(escrow)), AMOUNT);
    }

    function _permitDigest(address owner_, address spender, uint256 value, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes32)
    {
        bytes32 PERMIT_TYPEHASH =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash = keccak256(abi.encode(PERMIT_TYPEHASH, owner_, spender, value, nonce, deadline));
        return keccak256(abi.encodePacked("\x19\x01", ausd.DOMAIN_SEPARATOR(), structHash));
    }
}
