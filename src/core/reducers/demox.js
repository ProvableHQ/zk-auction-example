import { filterVisibility as f } from "../processing.js";

function updateStateFromRecords(state, records) {
    const auctionTickets = records.filter(record => record.recordName === "AuctionTicket");
    const bidReceipts = records.filter(record => record.recordName === "BidReceipt");
    const bidInvites = records.filter(record => record.recordName === "BidInvite");
    const privateBids = records.filter(record => record.recordName === "PrivateBid");
    const userAuctions = processAuctionTickets(state, auctionTickets, bidInvites);

    // Update auctions the user has created.
    const userAuctionIds = new Set(state.userAuctionIds);
    for (const auctionId of Object.keys(userAuctions)) {
        if (!userAuctionIds.has(auctionId)) {
            userAuctionIds.add(auctionId);
        }
    }
    
    // Process bid invites to find auction IDs the user was invited to.
    const [invitedAuctionIds, invitedAuctions] = processAuctionInvites(state, bidInvites);

    // Find user bid IDs from bid receipts.
    const [bids, bidsOnUserAuctions, userBidIds] = processBidReceipts(state, bidReceipts);

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
    return {
        ...state,
        auctions: mergedAuctions,
        bids: {
            ...state.bids,
            bids,
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
}

function processAuctionInvites (state, invites) {
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
                auctions[auctionId] = newAuctionFromInvite(state, invite);
            }
        } catch (error) {
            console.error(error);
        }
    }
    return [invitedAuctionIds, auctions];
}

function processBidReceipts (state, records) {
    const userBidIds = new Set(state.userBidIds);
    const bidsOnUserAuctions = new Set(state.bidsOnUserAuctions);
    const bids = { ...state.bids };
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
                bids[bidId] = newBidFromReceipt(state, record);
            }
        } catch (error) {
            console.error(error);
        }
    });
    return [bids, bidsOnUserAuctions, userBidIds];
}

// Process auction tickets from auctions.
function processAuctionTickets (state, auctionTickets) {
    const auctions = { ...state.auctions };
    auctionTickets.forEach(record => {
        try {
            const auctionId = f(record.data.auction_id);
            if (!(auctionId in state)) {
                auctions[auctionId] = newAuctionFromTicket(state, record);
            } else if (state[auctionId].activeTicket?.id !== record.id) {
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
function newAuctionFromTicket (state, record) {
    // Ensure the record is an AuctionTicket.
    if (record.recordName !== "AuctionTicket") {
        throw new Error("Attempt to add new AuctionTicket record to state failed. Record is not an AuctionTicket");
    }

    // Create an auction object from the state within the record.
    return {
        active: true,
        activeTicket: record,
        auctionId: f(record.data.auction_id),
        auctioneer: record.owner,
        bidTypes: f(record.data.settings.bid_types_accepted),
        recordId: record.id,
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

function newAuctionFromInvite(state, record) {
    // Ensure the record is an AuctionInvite.
    if (record.recordName !== "AuctionInvite") {
        throw new Error("Attempt to add new AuctionInvite record to state failed. Record is not an AuctionInvite");
    }

    // Create an auction object from the state within the record.
    return {
        active: false,
        activeTicket: null,
        auctionId: f(record.data.auction_id),
        auctioneer: f(record.data.auctioneer),
        bidTypes: f(record.data?.settings?.bid_types_accepted),
        recordId: record.id,
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

function newBidFromReceipt(state, record) {
    // Ensure the record is a BidReceipt.
    if (record.recordName !== "BidReceipt") {
        throw new Error("Attempt to add new BidReceipt record to state failed. Record is not a BidReceipt");
    }

    // Create a bid object from the state within the record.
    return {
        auctionId: f(record.data.auction_id),
        amount: f(record.data.amount),
        isPublic: false,
        owner: record.owner,
        id: f(record.data.bid_id),
    };
}

export { newAuctionFromTicket, newBidFromReceipt, processAuctionInvites, processAuctionTickets, processBidReceipts, updateStateFromRecords }