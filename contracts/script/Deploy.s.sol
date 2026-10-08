// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";

import {P2PEscrow} from "../src/P2PEscrow.sol";
import {PhoneResolver} from "../src/PhoneResolver.sol";
import {NonaRegistry} from "../src/NonaRegistry.sol";
import {NonaGateway} from "../src/NonaGateway.sol";

/// @notice Deploys NonaPay to Monad Testnet with MockKeystone forwarder for CRE simulate --broadcast.
contract DeployScript is Script {
    uint256 internal constant GRACE = 15 minutes;

    // Monad Testnet MockKeystoneForwarder (CRE simulate --broadcast)
    address internal constant MOCK_FORWARDER = 0xB9F79d863261869B234c481D1f9A7af84AeAd192;
    // Agora AUSD on Monad Testnet
    address internal constant AUSD = 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC;

    function run() external {
        address forwarder = vm.envOr("MOCK_FORWARDER", MOCK_FORWARDER);
        address ausd = vm.envOr("AUSD_ADDRESS", AUSD);

        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        P2PEscrow escrow = new P2PEscrow(GRACE);
        PhoneResolver resolver = new PhoneResolver();
        NonaRegistry registry = new NonaRegistry(forwarder, address(escrow), address(resolver));
        NonaGateway gateway = new NonaGateway(address(escrow), ausd);

        escrow.setGateway(address(gateway));
        escrow.setRegistry(address(registry));

        vm.stopBroadcast();

        console2.log("P2PEscrow", address(escrow));
        console2.log("PhoneResolver", address(resolver));
        console2.log("NonaRegistry", address(registry));
        console2.log("NonaGateway", address(gateway));
        console2.log("Forwarder", forwarder);
        console2.log("AUSD", ausd);
    }
}
