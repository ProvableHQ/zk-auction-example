import React, {createContext, useContext, useEffect, useState} from "react";
import { updatePublicState } from "../core/reducers/public.js";
import { updateStateFromRecords } from "../core/reducers/demox.js";
import { PROGRAM_ID } from "../core/constants.js";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";


// Create the context with a default value
const DataContext = createContext({});

// Custom hook to use the context
export const useAuctionState = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
};

// Define the data structure
export const AuctionState = ({ children }) => {
    const { connected, requestRecords } = useWallet();
    const [auctionState, setAuctionState] = useState({
        auctions: {},
        bids: {},
        walletAdapter: "",
        userAuctionIds: new Set(), // Auction IDs the user made.
        invitedAuctionIds: new Set(), // Auction IDs the user was invited to.
        userBidIds: new Set(), // Bid IDs the user made.
        bidsOnUserAuctions: new Set(), // Bid ids of auctions the user owns.
        auctionTickets: [], // List of auction tickets.
        bidInvites: [], // List of bid invite records.
        bidReceipts: [], // List of bid receipts.
        privateBids: [], // List of private bids.
        hasLoaded: false, // Flag to indicate if the state has loaded.
    });

    const updatePublicAuctionState = async () => {
        setAuctionState(prev => {
            // Save a snapshot and pass it into async work
            fetchAndMergePublicState(prev);
            return prev; // No state change yet
        });
    };

    const fetchAndMergePublicState = async (snapshot) => {
        const publicState = await updatePublicState(snapshot);
        setAuctionState(prev => ({
            ...prev,
            ...publicState,
            auctions: {
                ...prev.auctions,
                ...publicState.auctions,
            },
            bids: {
                ...prev.bids,
                ...publicState.bids,
            },
            userAuctionIds: new Set([...prev.userAuctionIds, ...publicState.userAuctionIds]),
            invitedAuctionIds: new Set([...prev.invitedAuctionIds, ...publicState.invitedAuctionIds]),
            userBidIds: new Set([...prev.userBidIds, ...publicState.userBidIds]),
            bidsOnUserAuctions: new Set([...prev.bidsOnUserAuctions, ...publicState.bidsOnUserAuctions]),
        }));
    };

    const updateAuctionStateFromRecords = (records) => {
        setAuctionState(prev => {
            const privateState = updateStateFromRecords(prev, records);
            const merged = {
                ...prev,
                ...privateState,
                auctions: {
                    ...prev.auctions,
                    ...privateState.auctions,
                },
                bids: {
                    ...prev.bids,
                    ...privateState.bids,
                },
                userAuctionIds: new Set([...prev.userAuctionIds, ...privateState.userAuctionIds]),
                invitedAuctionIds: new Set([...prev.invitedAuctionIds, ...privateState.invitedAuctionIds]),
                userBidIds: new Set([...prev.userBidIds, ...privateState.userBidIds]),
                bidsOnUserAuctions: new Set([...prev.bidsOnUserAuctions, ...privateState.bidsOnUserAuctions]),
            };
            return merged;
        });
        console.log("Updated auction state after private:", auctionState);
    }

    const updatePrivateAuctionState = async () => {
        console.log("Updating private auction state...");
        const records = await requestRecords(PROGRAM_ID);
        console.log("Records", records);
        updateAuctionStateFromRecords(records);
        console.log("AuctionState", auctionState);
    }

    const updateAuctionState = async (connected) => {
        if (connected) {
            await updatePrivateAuctionState();
        }
        await updatePublicAuctionState();
    }

    const updateAuctionStateOnConnect = async () => {
        if (!auctionState.hasLoaded) {
            await updateAuctionState(true);
            auctionState.hasLoaded = true;
        }
    }

    const getAuctionState = () => {
        return auctionState;
    }

    return (
        <DataContext.Provider 
            value={{ 
                auctionState,
                getAuctionState,
                updateAuctionState,
                updateAuctionStateOnConnect,
                updatePrivateAuctionState,
                updatePublicAuctionState,
                updateAuctionStateFromRecords,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};
