import React, { useState, useEffect } from 'react';
import { Card, List, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PROGRAM_ID } from '../../../core/constants';
import { parseAleoStyle } from "../../../core/processing";
import { AuctionCard } from '../../../components/AuctionCard';
import { AleoNetworkClient } from "@provablehq/sdk";

export const PublicAuctions = () => {
    const [loading, setLoading] = useState(false);
    const [publicAuctions, setPublicAuctions] = useState([]);
    const networkClient = new AleoNetworkClient("https://api.explorer.provable.com/v1");

    const fetchAuctionData = async () => {
        setLoading(true);
        try {
            const [publicAuctionsRes, publicBidsRes] = await Promise.all([
                fetch(`https://api.testnet.aleoscan.io/v2/mapping/list_program_mapping_values/${PROGRAM_ID}/public_auctions`),
                fetch(`https://api.testnet.aleoscan.io/v2/mapping/list_program_mapping_values/${PROGRAM_ID}/public_bids`),
            ]);

            // Process public auction mapping data
            const publicAuctionsRaw = (await publicAuctionsRes.json()).result.map(entry => ({
                id: entry.key,
                data: parseAleoStyle(entry.value),
            }));

            // Process public bid mapping data
            const publicBidsRaw = (await publicBidsRes.json()).result.map(entry => ({
                id: entry.key,
                data: parseAleoStyle(entry.value),
            }));

            // Organize public bids by auctionId
            const publicBidsByAuction = {};
            publicBidsRaw.forEach(bid => {
                const auctionId = bid.data.auction_id;
                if (!publicBidsByAuction[auctionId]) publicBidsByAuction[auctionId] = [];
                publicBidsByAuction[auctionId].push({
                    amount: parseInt(bid.data.amount.replace('u64', '')),
                    id: bid.id,
                    publicKey: bid.data.bid_public_key,
                });
            });

            console.log("Public Bids By Auction: ", publicBidsByAuction);

            // Process all public auctions
            const combinedAuctions = await Promise.all(
                publicAuctionsRaw.map(async (auction) => {
                    const auctionId = auction.id;
                    const isPublic = true; // These are all public auctions
                    const publicBids = publicBidsByAuction[auctionId] || [];
                    
                    console.log("AuctionData:  ", auction);
                    let highestBid = 0, totalBids = 0;
                    try {
                        const res = await networkClient.getProgramMappingPlaintext(PROGRAM_ID, 'highest_bids', auctionId);
                        highestBid = parseInt(res.replace('u64', ''));
                    } catch (e) {
                        console.warn(`Failed highestBid for ${auctionId}`, e);
                    }

                    try {
                        const res = await networkClient.getProgramMappingPlaintext(PROGRAM_ID, 'bid_count', auctionId);
                        totalBids = parseInt(res.replace('u64', ''));
                    } catch (e) {
                        console.warn(`Failed bid count for ${auctionId}`, e);
                    }

                    let bidTypesAccepted = "";
                    try {
                        const res = await networkClient.getProgramMappingPlaintext(PROGRAM_ID, 'auction_privacy_settings', auctionId);
                        bidTypesAccepted = res.toObject().bid_types_accepted;
                    } catch (e) {
                        console.warn(`Failed bid types accepted for ${auctionId}`, e);
                    }

                    let auctioneerAddress = "";
                    try {
                        const res = await networkClient.getProgramMappingPlaintext(PROGRAM_ID, 'auction_owners', auctionId);
                        auctioneerAddress = res.toObject();
                    } catch (e) {
                        console.warn(`Failed auctioneer address for ${auctionId}`, e);
                    }

                    console.log("Auctioneer Address: ", auctioneerAddress);
                    console.log("Bid Types Accepted: ", bidTypesAccepted);

                    // Count the actual number of public bids for this auction
                    const publicBidCount = publicBids.length;
                    
                    // For public auctions, we don't have private bids, but we'll set up the structure
                    const privateBids = [];

                    return {
                        auctionId,
                        isPublic,
                        auctioneerAddress,
                        publicBids,
                        privateBids,
                        highestBid,
                        totalBids: publicBidCount, // Use the actual count of public bids
                        ticket: {
                            data: {
                                auction: auction.data,
                                auctioneerAddress,
                                settings: { bid_types_accepted: bidTypesAccepted }
                            },
                            owner: auction.data.owner
                        },
                        data: {
                            ticket: {
                                data: {
                                    auction: auction.data,
                                    auctioneerAddress,
                                    settings: { bid_types_accepted: bidTypesAccepted }
                                },
                                owner: auction.data.owner
                            }
                        }
                    };
                })
            );

            setPublicAuctions(combinedAuctions);
        } catch (error) {
            console.error('Error fetching auctions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuctionData();
    }, []);

    return (
        <Card
            title="Public Auctions"
            extra={
                <Button icon={<ReloadOutlined />} onClick={fetchAuctionData} loading={loading}>
                    Refresh
                </Button>
            }
        >
            <List
                dataSource={publicAuctions}
                renderItem={(auction) => (
                    <AuctionCard
                        key={auction.auctionId}
                        auctionId={auction.auctionId}
                        data={auction}
                        loading={loading}
                    />
                )}
                locale={{ emptyText: 'No public auctions found' }}
            />
        </Card>
    );
};
