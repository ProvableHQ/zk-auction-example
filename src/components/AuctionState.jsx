import React, {createContext, useContext, useEffect, useState} from "react";
import { updatePublicState } from "../core/reducers/public.js";
import { updateStateFromRecords } from "../core/reducers/demox.js";
import { parseImages } from "../core/reducers/images.js";
import { PROGRAM_ID } from "../core/constants.js";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import {fieldsToString} from "../core/encoder.js";
import {filterVisibility, filterVisibility as f} from "../core/processing.js";


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
        metadata: {}, // Metadata for images.
    });

    const updatePublicAuctionState = async () => {
        setAuctionState(prev => {
            // Save a snapshot and pass it into async work
            fetchAndMergePublicState(prev);
            return prev; // No state change yet
        });
    };

    const updateMetadataState = async (state) => {
        const updatedState = await parseImages(state);
        setAuctionState(prev => ({
            ...prev,
            ...updatedState,
            auctions: {
                ...prev.auctions,
                ...updatedState.auctions,
            },
            metadata: {
                ...prev.metadata,
                ...updatedState.metadata,
            }
        }));
    }

    const addMetadataEntry = (metadataKey, json) => {
        setAuctionState(prev => ({
            ...prev,
            metadata: {
                ...prev.metadata,
                [metadataKey]: json,
            }
        }));
    }

    // Get auction metadata from the cache or fetch it if not cached.
    const getAuctionMetadata = async (auctionId) => {
        const metadata = auctionState.auctions[auctionId]?.metadata;
        if (!metadata) return {};

        const metadataKey = fieldsToString(
            metadata.map(field =>
                BigInt(filterVisibility(field).replace('field', ''))
            )
        );
        if (auctionState.metadata[metadataKey]) {
            console.log("Using cached metadata for", metadataKey);
            return auctionState.metadata[metadataKey];
        } else {
            console.log("Cache entry for metadata not found, fetching metadata for", metadataKey);
            try {
                const response = await fetch(metadataKey);
                const json = await response.json();

                // Store the fetched metadata in the state object.
                addMetadataEntry(metadataKey, json);

                return json;
            } catch (error) {
                console.log(`Error fetching metadata for auction ${auctionId}: ${error.message}`);
            }
        }
    }

    const updateMetadata = async () => {
        setAuctionState(prev => {
            // Save a snapshot and pass it into async work
            updateMetadataState(prev);
            return prev; // No state change yet
        });
    }

    const fetchAndMergePublicState = async (snapshot) => {
        const publicState = await updatePublicState(snapshot);
        setAuctionState(prev => {
                const publicStateUpdate = {
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
                };
                console.log("Updated auction state from public state:", publicStateUpdate);
                return publicStateUpdate;
            }
        );
    };

    const findHighestBid = (auctionId) => {
        let highestAmount = 0;

        // Check public bids
        getAuctionBids(auctionId).forEach(bid => {
            const amount = parseInt(bid.amount);
            if (amount > highestAmount) {
                highestAmount = amount;
            }
        });

        return highestAmount;
    }

    const updateAuctionStateFromRecords = (records) => {
        setAuctionState(prev => {
            const privateState = updateStateFromRecords(prev, records);
            const updatedState = {
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
            console.log("Updated auction state from records:", updatedState);
            return updatedState;
        });
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
        await updateMetadata();
    }

    const updateAuctionStateOnConnect = async () => {
        if (!auctionState.hasLoaded) {
            await updateAuctionState(true);
        }
        setAuctionState(prev => ({
            ...prev,
            auctions: {
                ...prev.auctions,
            },
            bids: {
                ...prev.bids,
            },
            hasLoaded: true,
        }));
    }

    const getAuctionState = () => {
        return auctionState;
    }

    const getAuctionBids = (auctionId) => {
        const bids = [];
        Object.keys(auctionState.bids).forEach(bid_id => {
            const bid = auctionState.bids[bid_id];
            if (bid.auctionId === auctionId) {
                bids.push(bid);
            }
        });
        return bids;
    }

    return (
        <DataContext.Provider 
            value={{ 
                auctionState,
                getAuctionState,
                getAuctionMetadata,
                getAuctionBids,
                findHighestBid,
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
