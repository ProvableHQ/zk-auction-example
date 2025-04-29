import React, {createContext, useContext, useEffect, useState} from "react";
import { updatePublicState } from "../core/reducers/public.js";
import { updateStateFromRecords } from "../core/reducers/demox.js";
import { parseImages } from "../core/reducers/images.js";
import { PROGRAM_ID } from "../core/constants.js";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import {convertFieldToString, fieldsToString} from "../core/encoder.js";
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
        if (!metadata || Object.keys(metadata).length === 0) return {};

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

    const getUserBids = () => {
        const bids = {};
        Object.keys(auctionState.bids).forEach(bid_id => {
            const bid = auctionState.bids[bid_id];
            if (auctionState.userBidIds.has(bid_id)) {
                bids[bid_id] = bid;
            }
        });
        return bids;
    }

    const addAuctionMetadataToBids = async (bids) => {
        const updatedBids = {};

        // Properly iterate over the actual bid objects
        for (const bid of Object.values(bids)) {
            const auctionId = bid.auctionId;
            let metadata;
            try {
                metadata = JSON.parse(await getAuctionMetadata(auctionId));
            } catch (e) {
                console.warn("Error parsing metadata for auction", auctionId);
                metadata = {};
            }

            let auctionName = "";
            try {
                auctionName = convertFieldToString(auctionState.auctions[auctionId]?.name);
            } catch (e) {
                console.warn("Error converting auction name for auction", auctionId);
            }
            const highestBid = findHighestBid(auctionId);
            const isHighestBid = highestBid === bid.amount;
            const isAuctionPublic = (auctionState.auctions[auctionId]?.privacy === "1field");
            const isAuctionActive = !auctionState.auctions[auctionId]?.winner;
            const winner = auctionState.auctions[auctionId]?.winner === bid.id;
            const redeemed = auctionState.auctions[auctionId]?.redeemed;
            updatedBids[bid.id] = {
                ...bid,
                metadata,
                auctionName,
                highestBid,
                isHighestBid,
                isAuctionPublic,
                isAuctionActive,
                winner,
                redeemed,
            };
        }

        return updatedBids;
    };

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
        try {
            const records = await requestRecords(PROGRAM_ID);
            updateAuctionStateFromRecords(records);
        } catch (error) {
            console.error("Error fetching records:", error);
        }
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
                addAuctionMetadataToBids,
                auctionState,
                getAuctionState,
                getAuctionMetadata,
                getAuctionBids,
                getUserBids,
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
