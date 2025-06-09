import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import {PROGRAM_ID} from "./constants.js";

export async function createTransaction(params, execute, walletName) {
    console.log("Creating transactions with", walletName, "with params:", params);

    if (walletName === "Puzzle Wallet") {
        // Create a transaction using the Puzzle Wallet SDK by calling the createEvent function.
        const createEventResponse = await execute(params)

        // Handle the response from the Puzzle Wallet SDK.
        if (createEventResponse.error) {
            console.log(`Error creating event: ${createEventResponse.error}`);
        } else {
            console.log(`Transaction created successfully: ${createEventResponse.eventId}`);
        }
    } else {
        // Create a transaction using the Leo wallet.
        const transaction = Transaction.createTransaction(
            params.publicKey,
            WalletAdapterNetwork.TestnetBeta,
            PROGRAM_ID,
            params.functionName,
            params.inputs,
            params.fee,
            params.feePrivate,
        );

        // Call the requestTransaction function on the Leo Wallet.
        await execute(transaction);
    }
}