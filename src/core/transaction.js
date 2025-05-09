import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import {PROGRAM_ID} from "./constants.js";

export async function createTransaction(params, execute, walletName) {
    if (walletName === "Puzzle Wallet") {
        // Create a transaction using the Puzzle Wallet SDK
        const createEventResponse = await execute(params)
        if (createEventResponse.error) {
            console.log(`Error creating event: ${createEventResponse.error}`);
        } else {
            console.log(`Transaction created successfully: ${createEventResponse.eventId}`);
        }
    } else {
        const transaction = Transaction.createTransaction(
            params.publicKey,
            WalletAdapterNetwork.TestnetBeta,
            PROGRAM_ID,
            params.functionName,
            params.inputs,
            params.fee,
            params.feePrivate,
        );

        await execute(transaction);
    }



}