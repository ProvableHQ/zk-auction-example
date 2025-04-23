import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { PROGRAM_ID } from '../../core/constants.js';
import { filterVisibility as f } from '../../core/processing.js';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../components/AuctionState.jsx';
import { AuctionCard } from '../../components/AuctionCard.jsx';
import { WalletMultiButton } from "@demox-labs/aleo-wallet-adapter-reactui";

const { Text } = Typography;

export const OpenAuctions = () => {
    const { connected, publicKey } = useWallet();
    const { auctionState, updateAuctionStateOnConnect, updatePrivateAuctionState, updatePublicAuctionState } = useAuctionState();
    const [loading, setLoading] = useState(false);
    const [auctionData, setAuctionData] = useState({});

    const processAuctionData = () => {
        setLoading(true);
        try {
            const processedData = {};

            console.log("Processing auction data...", auctionState);
            
            // Get auctions owned by the current user
            const userAuctions = Object.entries(auctionState.auctions || {})
                .filter(([_, auction]) => auction.auctioneer === publicKey);
            
            for (const [auctionId, auction] of userAuctions) {
                // Skip redeemed auctions
                if (auction.redeemed) continue;
                
                // Get public bids for this auction
                const publicBids = Object.values(auctionState.bids || {})
                    .filter(bid => bid.auctionId === auctionId && bid.isPublic)
                    .map(bid => ({
                        amount: bid.amount,
                        auctionId: bid.auctionId,
                        bidder: bid.owner,
                        id: bid.id,
                    }));

                // Get private bids for this auction
                const privateBids = auctionState.privateBids
                    .filter(record => {
                        try {
                            return f(record.data.bid.auction_id) === auctionId;
                        } catch (e) {
                            return false;
                        }
                    })
                    .map(record => {
                        return {
                            auctionId: f(record.data.bid.auction_id),
                            amount: parseInt(f(record.data.bid.amount).replace('u64', '')),
                            id: f(record.data.bid_id),
                            bidder: f(record.data.bid.bid_public_key)
                        };
                    });

                // Create the data object for AuctionCard
                processedData[auctionId] = {
                    ticketRecord: auction.activeTicket,
                    name: auction.name,
                    metadata: auction.metadata,
                    auctioneer: auction.auctioneer,
                    bidTypes: auction.bidTypes,
                    privacy: auction.privacy,
                    invited: auction.invited,
                    redeemed: auction.redeemed,
                    active: !auction.winner,
                    startingBid: auction.startingBid,
                    auctionId,
                    isPublic: auction.privacy === "1field" || false,
                    highestBid: auction.highestBid || 0,
                    totalBids: auction.bidCount || 0,
                    publicBids,
                    privateBids
                };
            }

            console.log("Processed Data: ", processedData);
            setAuctionData(processedData);
        } catch (error) {
            console.error('Error processing auction data:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            // Update both private and public state
            if (connected) {
                await updatePrivateAuctionState();
            }
            await updatePublicAuctionState();
            // Process the updated state
            processAuctionData();
        } catch (error) {
            console.error('Error refreshing auction data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (connected) {
            updateAuctionStateOnConnect().then(() => {
                console.log("Auction state updated.", auctionState);
                processAuctionData();
            });
        }
    }, [connected]);

    // Process auction data whenever the auction state changes
    useEffect(() => {
        if (Object.keys(auctionState.auctions || {}).length > 0) {
            processAuctionData();
        }
    }, [auctionState]);

    return (
        <Card
            title="My Open Auctions"
            extra={
                <Button
                    icon={<ReloadOutlined />}
                    onClick={refreshData}
                    loading={loading}
                    disabled={!connected}
                >
                    Refresh
                </Button>
            }
            style={{ width: '100%' }}
        >
            {!connected ? (
                <>
                    <WalletMultiButton />
                    <Text>Please connect your wallet to view your auctions</Text>
                </>
            ) : (
                <List
                    dataSource={Object.entries(auctionData)}
                    renderItem={([auctionId, data]) => (
                        <AuctionCard auctionId={auctionId} data={data} loading={loading} />
                    )}
                    locale={{ emptyText: 'No open auctions found' }}
                />
            )}
        </Card>
    );
};
