import { useMemo } from "react";
import { WalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { PROGRAM_ID } from "../core/constants.js";
import {
    PuzzleWalletAdapter,
} from "aleo-adapters";
import {
    DecryptPermission,
    WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

// Configure the wallet options to be used in the application.
export const WalletWrapper = ({ children }) => {
    // Initialize wallets inside a functional component using useMemo.
    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: "zkAuction",
            }),
            new PuzzleWalletAdapter({
                programIdPermissions: {
                    [WalletAdapterNetwork.MainnetBeta]: [
                        PROGRAM_ID,
                    ],
                    [WalletAdapterNetwork.TestnetBeta]: [
                        PROGRAM_ID,
                    ],
                },
                appName: "zkAuction",
                appDescription: "Private Auctions on Aleo",
            }),
        ],
        []
    );

    return (
        <WalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.UponRequest}
            network={WalletAdapterNetwork.TestnetBeta} // Change to 'MainnetBeta' or 'TestnetBeta' if needed
            autoConnect
        >
            <WalletModalProvider>
                {children}
            </WalletModalProvider>
        </WalletProvider>
    );
};