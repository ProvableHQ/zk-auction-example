import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import { AuctionCard } from '../../../components/AuctionCard';

const { Text } = Typography;

export const PublicAuctions = () => {
    const { connected } = useWallet();
    const { auctionState, updateAuctionStateOnConnect, updatePublicAuctionState } = useAuctionState();
    const [loading, setLoading] = useState(false);
    const [auctionData, setAuctionData] = useState({});

    const processAuctionData = () => {
        setLoading(true);
        try {
            const processedData = {};

            console.log("Processing auction data...", auctionState);
            
            // Get public auctions
            const publicAuctions = Object.entries(auctionState.auctions || {})
                .filter(([_, auction]) => auction.isPublic);
            
            for (const [auctionId, auction] of publicAuctions) {
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

                // For public auctions, we don't have private bids, but we'll set up the structure
                const privateBids = [];

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
                    isPublic: auction.isPublic,
                    highestBid: auction.highestBid || 0,
                    totalBids: auction.bidCount || 0,
                    publicBids,
                    privateBids,
                    displayId: auctionId.substring(0, 20) + '...' // Add a shortened auction ID for display
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
            // Update the public state
            await updatePublicAuctionState();
            // Process the updated state
            processAuctionData();
        } catch (error) {
            console.error('Error refreshing auction data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Update the auction state when the component mounts
        updateAuctionStateOnConnect().then(() => {
            console.log("Auction state updated for PublicAuctions.", auctionState);
            processAuctionData();
        });
    }, []);

    // Process auction data whenever the auction state changes
    useEffect(() => {
        if (Object.keys(auctionState.auctions || {}).length > 0) {
            processAuctionData();
        }
    }, [auctionState]);

    return (
        <Card
            title="Public Auctions"
            extra={
                <Button icon={<ReloadOutlined />} onClick={refreshData} loading={loading}>
                    Refresh
                </Button>
            }
        >
            <List
                dataSource={Object.entries(auctionData)}
                renderItem={([auctionId, data]) => (
                    <div>
                        <Space style={{ marginBottom: '8px' }}>
                            <Text type="secondary">Auction ID: {data.displayId}</Text>
                        </Space>
                        <AuctionCard auctionId={auctionId} data={data} loading={loading} />
                    </div>
                )}
                locale={{ emptyText: 'No public auctions found' }}
            />
        </Card>
    );
};
