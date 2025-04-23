import {PROGRAM_ID} from "../constants.js";
import {parseAleoStyle} from "../processing.js";

const AUCTIONKEYS = [
    "auction_owners",
    "auction_privacy_settings",
    "bid_count",
    "highest_bids",
    "public_auctions",
    "redemptions",
    "winning_bids"
];

const BIDKEYS = [
    "public_bids",
    "public_bid_owners",
    "winning_bids"
]

async function fetchPublicState(mappingKeys) {
    // Fetch all mapping values concurrently.
    const mappingPromises = mappingKeys.map(key =>
        fetch(`https://api.testnet.aleoscan.io/v2/mapping/list_program_mapping_values/${PROGRAM_ID}/${key}`)
            .then(res => res.json())
    );
    const results = await Promise.all(mappingPromises);

    // Create parsed mapping object with parsed results.
    return mappingKeys.reduce((acc, key, i) => {
        try {
            acc[key] = results[i].result.map(entry => ({
                id: entry.key,
                data: parseAleoStyle(entry.value),
            }));
            return acc;
        } catch (error) {
            return acc;
        }
    }, {});
}

function parsePublicAuctionState(state, publicAuctions) {
    const reducers = [
        {
            key: 'auction_owners',
            fn: (acc, { id, data }) => {
                acc[id] = { ...acc[id], auctioneer: data };
                return acc;
            },
        },
        {
            key: 'auction_privacy_settings',
            fn: (acc, { id, data }) => {
                acc[id] = {
                    ...acc[id],
                    isPublic: data.auction_privacy !== '0field',
                    bidTypes: data.bid_types_accepted,
                };
                return acc;
            },
        },
        {
            key: 'bid_count',
            fn: (acc, { id, data }) => {
                acc[id] = {
                    ...acc[id],
                    bidCount: parseInt(data.replace('u64', '')),
                };
                return acc;
            },
        },
        {
            key: 'highest_bids',
            fn: (acc, { id, data }) => {
                acc[id] = {
                    ...acc[id],
                    highestBid: parseInt(data.replace('u64', '')),
                };
                return acc;
            },
        },
        {
            key: 'public_auctions',
            fn: (acc, { id, data }) => {
                acc[id] = {
                    ...acc[id],
                    startingBid: parseInt(data.starting_bid.replace('u64', '')),
                    name: data.name,
                    metadata: data.item.offchain_data,
                    itemId: data.item.id,
                };
                return acc;
            },
        },
        {
            key: 'redemptions',
            fn: (acc, { id }) => {
                acc[id] = {
                    ...acc[id],
                    redeemed: true,
                };
                return acc;
            },
        },
        {
            key: 'winning_bids',
            fn: (acc, { id, data }) => {
                acc[id] = {
                    ...acc[id],
                    winner: data,
                };
                return acc;
            },
        },
        {
            key: null,
            fn: (acc) => {
                for (const [id, auction] of Object.entries(acc)) {
                    const prev = state.auctions?.[id] ?? {};

                    const winner = prev.winner ?? auction.winner ?? "";
                    const redeemed = prev.redeemed ?? auction.redeemed ?? false;
                    const active = prev.active ?? (winner ? false : true);
                    const activeTicket = prev.activeTicket ?? null;

                    acc[id] = {
                        ...auction,
                        id,
                        winner,
                        redeemed,
                        active,
                        activeTicket,
                        privateBids: prev.privateBids ?? new Set(),
                        publicBids: prev.publicBids ?? new Set(),
                        isPublic: auction.isPublic ?? prev.isPublic ?? false,
                        bidTypes: auction.bidTypes ?? prev.bidTypes ?? "",
                        highestBid: auction.highestBid ?? prev.highestBid ?? null,
                        startingBid: auction.startingBid ?? prev.startingBid ?? null,
                        metadata: auction.metadata ?? prev.metadata ?? {},
                        auctioneer: auction.auctioneer ?? prev.auctioneer ?? "",
                        itemId: auction.itemId ?? prev.itemId ?? "",
                        name: auction.name ?? prev.name ?? "",
                    };
                }
                return acc;
            },
        }
    ];

    // Start with a copy of the existing state.auctions to preserve private data
    const reducedAuctions = reducers.reduce((acc, { key, fn }) => {
        if (key === null) return fn(acc);
        (publicAuctions[key] || []).forEach(entry => fn(acc, entry));
        return acc;
    }, { ...state.auctions });

    return {
        ...state,
        auctions: reducedAuctions,
    };
}

// Populate the auction state with public auction data.
function parsePublicBidState(state, publicBids) {
    const reducers = [
        {
            key: 'public_bids',
            fn: (acc, { id, data }) => {
                acc[id] = {
                    ...acc[id],
                    id,
                    amount: parseInt(data.amount.replace('u64', '')),
                    auctionId: data.auction_id,
                    isPublic: true,
                    owner: "",
                };
                return acc;
            },
        },
        {
            key: 'public_bid_owners',
            fn: (acc, { id, data }) => {
                acc[id] = { ...acc[id], owner: data };
                return acc;
            },
        },
        {
            key: 'winning_bids',
            fn: (acc, { id, data }) => {
                acc[data] = {
                    ...acc[data],
                    winner: true,
                };
                return acc;
            },
        },
        {
            key: null,
            fn: (acc) => {
                for (const [id, bid] of Object.entries(acc)) {
                    const prev = state.bids?.[id] ?? {};

                    acc[id] = {
                        ...bid,
                        id,
                        auctionId: bid.auctionId ?? prev.auctionId ?? "",
                        isPublic: bid.isPublic ?? prev.isPublic ?? false,
                        winner: bid.winner ?? prev.winner ?? false,
                        amount: bid.amount ?? prev.amount ?? 0,
                        auctioneer: bid.auctioneer ?? prev.auctioneer ?? "",
                    };
                }
                return acc;
            },
        }
    ];

    const reducedBids = reducers.reduce((acc, { key, fn }) => {
        if (key === null) return fn(acc);
        (publicBids[key] || []).forEach(entry => fn(acc, entry));
        return acc;
    }, { ...state.bids });

    return {
        ...state,
        bids: reducedBids,
    };
}

async function updatePublicState(state) {
    const [auctionData, bidData] = await Promise.all([
        fetchPublicState(AUCTIONKEYS),
        fetchPublicState(BIDKEYS),
    ]);

    const updatedWithAuctions = parsePublicAuctionState(state, auctionData);
    return parsePublicBidState(updatedWithAuctions, bidData);
}

export { parsePublicBidState, fetchPublicState, parsePublicAuctionState, updatePublicState }