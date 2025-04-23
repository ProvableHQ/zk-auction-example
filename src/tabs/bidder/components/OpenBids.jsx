import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Row, Col, Space, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import { filterVisibility } from '../../../core/processing';
import { fieldsToString } from '../../../core/encoder';

const { Text } = Typography;

export const OpenBids = () => {
    const { connected, publicKey } = useWallet();
    const { auctionState, updateAuctionStateOnConnect, updatePrivateAuctionState } = useAuctionState();
    const [loading, setLoading] = useState(false);
    const [bidData, setBidData] = useState({});
    const [auctionMetadata, setAuctionMetadata] = useState({});

    const processBidData = () => {
        setLoading(true);
        try {
            const processedData = {};
            console.log("Processing bid data...", auctionState);

            // Get bids made by the current user
            const userBids = Object.values(auctionState.bids || {})
                .filter(bid => bid.owner === publicKey);
            
            // Get private bids made by the current user
            const privateBids = auctionState.privateBids
                .filter(record => {
                    try {
                        return filterVisibility(record.data.bid.bid_public_key) === publicKey;
                    } catch (e) {
                        return false;
                    }
                });

            // Process public bids
            for (const bid of userBids) {
                const auctionId = bid.auctionId;
                const auction = auctionState.auctions[auctionId];
                
                if (!auction) continue;
                
                // Skip if auction is redeemed
                if (auction.redeemed) continue;

                console.log("Auction winer: ", auction.winner);
                
                processedData[bid.id] = {
                    id: bid.id,
                    auctionId: auctionId,
                    amount: bid.amount,
                    isPublic: bid.isPublic,
                    name: auction.name,
                    metadata: auction.metadata ? auction.metadata : [],
                    auctioneer: auction.auctioneer,
                    highestBid: auction.highestBid || 0,
                    startingBid: auction.startingBid,
                    isPublicAuction: auction.isPublic,
                    active: !auction.winner,
                    redeemed: auction.redeemed
                };
            }

            // Process private bids
            for (const record of privateBids) {
                try {
                    const auctionId = filterVisibility(record.data.bid.auction_id);
                    const auction = auctionState.auctions[auctionId];
                    
                    if (!auction) continue;
                    
                    // Skip if auction is redeemed
                    if (auction.redeemed) continue;
                    
                    const bidId = filterVisibility(record.data.bid_id);
                    const amount = parseInt(filterVisibility(record.data.bid.amount).replace('u64', ''));
                    
                    processedData[bidId] = {
                        id: bidId,
                        auctionId: auctionId,
                        amount: amount,
                        isPublic: false,
                        auctionName: auction.name,
                        auctionImage: auction.metadata?.image || '',
                        auctioneer: auction.auctioneer,
                        highestBid: auction.highestBid || 0,
                        startingBid: auction.startingBid,
                        isPublicAuction: auction.isPublic,
                        active: !auction.winner,
                        redeemed: auction.redeemed,
                        originalRecord: record
                    };
                } catch (error) {
                    console.error('Error processing private bid:', error);
                }
            }

            console.log("Processed Bid Data: ", processedData);
            setBidData(processedData);
        } catch (error) {
            console.error('Error processing bid data:', error);
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            // Update the private state
            if (connected) {
                await updatePrivateAuctionState();
            }
            // Process the updated state
            processBidData();
        } catch (error) {
            console.error('Error refreshing bid data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Update the auction state when the component mounts
        if (connected) {
            updateAuctionStateOnConnect().then(() => {
                console.log("Auction state updated for OpenBids.", auctionState);
                processBidData();
            });
        }
    }, [connected]);

    // Process bid data whenever the auction state changes
    useEffect(() => {
        if (Object.keys(auctionState.auctions || {}).length > 0) {
            processBidData();
        }
    }, [auctionState]);

    return (
        <Card
            title="Your Open Bids"
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
        >
            <List
                dataSource={Object.entries(bidData)}
                renderItem={([bidId, bid]) => {
                    const shortAuctionId = `${bid.auctionId.substring(0, 20)}...field`;

                    return (
                        <Card size="small" style={{ marginBottom: 16 }}>
                            <Row align="middle" gutter={16}>
                                {bid.auctionImage && (
                                    <Col span={4}>
                                        <img 
                                            src={bid.auctionImage} 
                                            alt="Auction item"
                                            style={{ 
                                                width: '50px',
                                                height: '50px',
                                                objectFit: 'cover',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </Col>
                                )}
                                <Col span={bid.auctionImage ? 20 : 24}>
                                    <Space direction="vertical" size={0}>
                                        <Text strong>
                                            Bid Amount: {bid.amount / 1_000_000} ALEO
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                            Auction ID: {shortAuctionId}
                                        </Text>
                                        {bid.auctionName && (
                                            <Text type="secondary">
                                                Auction: {bid.auctionName}
                                            </Text>
                                        )}
                                        <Space>
                                            <Tag color={bid.isPublic ? 'blue' : 'purple'}>
                                                {bid.isPublic ? 'Public' : 'Private'} Bid
                                            </Tag>
                                            <Tag color={bid.active ? 'green' : 'red'}>
                                                {bid.active ? 'Open' : 'Closed'}
                                            </Tag>
                                        </Space>
                                    </Space>
                                </Col>
                            </Row>
                        </Card>
                    );
                }}
                locale={{ emptyText: connected ? 'No open bids found' : 'Please connect your wallet' }}
            />
        </Card>
    );
}; 