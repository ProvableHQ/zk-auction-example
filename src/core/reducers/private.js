import { filterVisibility as f } from "../processing.js";

function updateStateFromRecords(state, records, walletName) {
    let nameKey = "recordName"
    let idKey = "id"
    console.log("Wallet Name", walletName);
    if (walletName === "Puzzle Wallet") {
        nameKey = "name"
        idKey = "_id"
    }

    const auctionTickets = records.filter(record => record[nameKey] === "AuctionTicket");
    const bidReceipts = records.filter(record => record[nameKey] === "BidReceipt");
    const bidInvites = records.filter(record => record[nameKey] === "BidInvite");
    const privateBids = records.filter(record => record[nameKey] === "PrivateBid");
    const userAuctions = processAuctionTickets(state, auctionTickets, idKey, nameKey);

    // Update auctions the user has created.
    const userAuctionIds = new Set(state.userAuctionIds);
    for (const auctionId of Object.keys(userAuctions)) {
        if (!userAuctionIds.has(auctionId)) {
            userAuctionIds.add(auctionId);
        }
    }
    
    // Process bid invites to find auction IDs the user was invited to.
    const [invitedAuctionIds, invitedAuctions] = processAuctionInvites(state, bidInvites, idKey, nameKey);

    // Find user bid IDs from bid receipts.
    const [bids, bidsOnUserAuctions, userBidIds] = processBidReceipts(state, bidReceipts, idKey, nameKey);

    // Create a merged auctions object that preserves existing state
    const mergedAuctions = { ...state.auctions };
    
    // Merge user auctions
    for (const [auctionId, auction] of Object.entries(userAuctions)) {
        if (mergedAuctions[auctionId]) {
            // Merge with existing auction data, preserving important fields
            mergedAuctions[auctionId] = {
                ...mergedAuctions[auctionId],
                ...auction,
                // Preserve these specific fields from public data if they exist
                isPublic: mergedAuctions[auctionId].isPublic !== undefined ? 
                    mergedAuctions[auctionId].isPublic : auction.isPublic,
                bidTypes: mergedAuctions[auctionId].bidTypes || auction.bidTypes,
                highestBid: mergedAuctions[auctionId].highestBid || auction.highestBid,
                bidCount: mergedAuctions[auctionId].bidCount || auction.bidCount,
                // Merge bid sets if they exist
                publicBids: mergedAuctions[auctionId].publicBids ? 
                    new Set([...mergedAuctions[auctionId].publicBids, ...(auction.publicBids || [])]) : 
                    auction.publicBids,
                privateBids: mergedAuctions[auctionId].privateBids ? 
                    new Set([...mergedAuctions[auctionId].privateBids, ...(auction.privateBids || [])]) : 
                    auction.privateBids,
            };
        } else {
            mergedAuctions[auctionId] = auction;
        }
    }
    
    // Merge invited auctions
    for (const [auctionId, auction] of Object.entries(invitedAuctions)) {
        if (mergedAuctions[auctionId]) {
            // Merge with existing auction data, preserving important fields
            mergedAuctions[auctionId] = {
                ...mergedAuctions[auctionId],
                ...auction,
                // Preserve these specific fields from public data if they exist
                isPublic: mergedAuctions[auctionId].isPublic !== undefined ? 
                    mergedAuctions[auctionId].isPublic : auction.isPublic,
                bidTypes: mergedAuctions[auctionId].bidTypes || auction.bidTypes,
                highestBid: mergedAuctions[auctionId].highestBid || auction.highestBid,
                bidCount: mergedAuctions[auctionId].bidCount || auction.bidCount,
                // Merge bid sets if they exist
                publicBids: mergedAuctions[auctionId].publicBids ? 
                    new Set([...mergedAuctions[auctionId].publicBids, ...(auction.publicBids || [])]) : 
                    auction.publicBids,
                privateBids: mergedAuctions[auctionId].privateBids ? 
                    new Set([...mergedAuctions[auctionId].privateBids, ...(auction.privateBids || [])]) : 
                    auction.privateBids,
            };
        } else {
            mergedAuctions[auctionId] = auction;
        }
    }

    // Return the auction state derived from the records.
    const reducedState = {
        ...state,
        auctions: mergedAuctions,
        bids: {
            ...state.bids,
            ...bids,
        },
        auctionTickets,
        bidInvites,
        bidReceipts,
        bidsOnUserAuctions,
        invitedAuctionIds,
        privateBids,
        userAuctionIds,
        userBidIds,
    };
    console.log("Reduced private state", reducedState);
    return reducedState;
}

function processAuctionInvites (state, invites, idKey, nameKey) {
    const auctions = { ...state.auctions };
    console.log("Processing auction invites auctions: ", auctions);
    const invitedAuctionIds = new Set(state.invitedAuctionIds);
    for (const invite of invites) {
        try {
            const auctionId = f(invite.data.auction_id);
            if (!invitedAuctionIds.has(auctionId)) {
                invitedAuctionIds.add(auctionId);
            }
            if (!(auctionId in auctions)) {
                auctions[auctionId] = newAuctionFromInvite(state, invite, idKey, nameKey);
            }
        } catch (error) {
            console.error(error);
        }
    }
    return [invitedAuctionIds, auctions];
}

function processBidReceipts (state, records, idKey, nameKey) {
    const userBidIds = new Set(state.userBidIds);
    const bidsOnUserAuctions = new Set(state.bidsOnUserAuctions);
    const bids = { ...state.bids };
    console.log("Bids prior to processing", bids);
    records.forEach(record => {
        try {
            const bidId = f(record.data.bid_id);
            const auctionId = f(record.data.auction_id);
            if (!userBidIds.has(bidId)) {
                userBidIds.add(bidId);
            }
            if (!bidsOnUserAuctions.has(bidId) && state.userAuctionIds.has(auctionId)) {
                bidsOnUserAuctions.add(bidId);
            }
            if (!(bidId in bids)) {
                bids[bidId] = newBidFromReceipt(state, record, nameKey);
            }
        } catch (error) {
            console.error(error);
        }
    });
    console.log("bids after processing", bids);
    return [bids, bidsOnUserAuctions, userBidIds];
}

// Process auction tickets from auctions.
function processAuctionTickets (state, auctionTickets, idKey, nameKey) {
    console.log(`While processing auction Tickets: idKey: ${idKey}, nameKey: ${nameKey}`);
    const auctions = { ...state.auctions };

    auctionTickets.forEach(record => {
        try {
            const auctionId = f(record.data.auction_id);
            if (!(auctionId in state)) {
                auctions[auctionId] = newAuctionFromTicket(state, record, idKey, nameKey);
            } else if (state[auctionId].activeTicket?.[idKey] !== record[idKey]) {
                auctions[auctionId] = {
                    ...state[auctionId],
                    activeTicket: record,
                }
            }
        } catch (error) {
            console.error(error);
        }
    });

    return auctions;
}

// Set auctioneer record from AuctionTicket.
function newAuctionFromTicket (state, record, idKey, nameKey) {
    console.log("Creating auction from ticket", record);
    console.log("idKey, idKeyValue: ", idKey, record[idKey]);
    console.log("Namekey, nameKeyValue ", nameKey, record[nameKey]);

    // Ensure the record is an AuctionTicket.
    if (record[nameKey] !== "AuctionTicket") {
        throw new Error("Attempt to add new AuctionTicket record to state failed. Record is not an AuctionTicket");
    }

    // Create an auction object from the state within the record.
    return {
        active: true,
        activeTicket: record,
        auctionId: f(record.data.auction_id),
        auctioneer: record.owner,
        bidTypes: f(record.data.settings.bid_types_accepted),
        recordId: record[idKey],
        invited: false,
        itemId: f(record.data.auction.item.id),
        highestBid: 0,
        metadata: f(record.data.auction.item.offchain_data),
        name: f(record.data.auction.name),
        publicBids: new Set(),
        privateBids: new Set(),
        privacy: f(record.data.settings.auction_privacy),
        redeemed: false,
        startingBid: parseInt(f(record.data.auction.starting_bid) || 0),
        winner: "",
    };
}

function newAuctionFromInvite(state, record, walletName, idKey, nameKey) {
    // Ensure the record is an AuctionInvite.
    if (record[nameKey] !== "AuctionInvite") {
        throw new Error("Attempt to add new AuctionInvite record to state failed. Record is not an AuctionInvite");
    }

    // Create an auction object from the state within the record.
    return {
        active: false,
        activeTicket: null,
        auctionId: f(record.data.auction_id),
        auctioneer: f(record.data.auctioneer),
        bidTypes: f(record.data?.settings?.bid_types_accepted),
        recordId: record[idKey],
        itemId: f(record.data?.item?.id),
        highestBid: 0,
        metadata: f(record.data?.item?.offchain_data),
        name: f(record.data?.auction?.name),
        publicBids: new Set(),
        privateBids: new Set(),
        privacy: f(record.data?.settings?.auction_privacy),
        redeemed: false,
        startingBid: parseInt(f(record.data?.auction?.starting_bid) || 0),
        winner: "",
    };
}

function newBidFromReceipt(state, record, nameKey) {
    // Ensure the record is a BidReceipt.
    if (record[nameKey] !== "BidReceipt") {
        throw new Error("Attempt to add new BidReceipt record to state failed. Record is not a BidReceipt");
    }

    // Create a bid object from the state within the record.
    return {
        auctionId: f(record.data.auction_id),
        amount: parseInt(f(record.data.bid.amount).replace("u64", "")),
        isPublic: false,
        owner: record.owner,
        publicKey: f(record.data.bid.bid_public_key),
        id: f(record.data.bid_id),
    };
}

export { newAuctionFromTicket, newBidFromReceipt, processAuctionInvites, processAuctionTickets, processBidReceipts, updateStateFromRecords }