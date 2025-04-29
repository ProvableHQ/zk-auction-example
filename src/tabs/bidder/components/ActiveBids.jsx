import React, { useState, useEffect } from 'react';
import {List, Card, Typography, Space, Button, Row, Col, Tag} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import { filterVisibility } from '../../../core/processing';
import {convertFieldToString, fieldsToString} from '../../../core/encoder';

const { Text } = Typography;

export const ActiveBids = () => {
    const { connected } = useWallet();
    const { auctionState, updateAuctionStateOnConnect, updatePublicAuctionState } = useAuctionState();
    const [loading, setLoading] = useState(false);
    const [bids, setBids] = useState([]);
    const [auctionMetadata, setAuctionMetadata] = useState({});

    // Function to fetch metadata for an auction
    const fetchAuctionMetadata = async (auctionId, metadata) => {
        if (!metadata) return;
        
        try {
            const metadataUrl = fieldsToString(
                metadata.map(field => 
                    BigInt(filterVisibility(field).replace('field', ''))
                )
            );
            
            const response = await fetch(metadataUrl);
            const json = await response.json();
            const parsedMetadata = JSON.parse(json);
            
            if (parsedMetadata.image) {
                setAuctionMetadata(prev => ({
                    ...prev,
                    [auctionId]: {
                        ...prev[auctionId],
                        image: parsedMetadata.image
                    }
                }));
            }
        } catch (error) {
            console.warn('Error fetching metadata for auction:', auctionId, error);
        }
    };

    const processBidData = () => {
        setLoading(true);
        try {
            // Get all public bids from the auction state
            const publicBids = Object.values(auctionState.bids || {})
                .filter(bid => bid.isPublic)
                .slice(0, 100); // Limit to 100 bids
            
            // Process bids and fetch metadata for each auction
            const processedBids = publicBids.map(bid => {
                const auctionId = bid.auctionId;
                const auction = auctionState.auctions[auctionId];
                
                // Fetch metadata for this auction if available
                if (auction && auction.metadata) {
                    fetchAuctionMetadata(auctionId, auction.metadata);
                }
                
                return {
                    id: bid.id,
                    amount: bid.amount,
                    auctionId: auctionId,
                    publicKey: bid.publicKey,
                    name: auction ? auction.name : null
                };
            });
            
            setBids(processedBids);
        } catch (error) {
            console.error('Error processing bid data:', error);
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
            processBidData();
        } catch (error) {
            console.error('Error refreshing bid data:', error);
            setLoading(false);
        }
    };

    // Process bid data whenever the auction state changes
    useEffect(() => {
        if (Object.keys(auctionState.bids || {}).length > 0) {
            processBidData();
        }
    }, [auctionState]);

    return (
        <Card
            title="Active Bids"
            extra={
                <Button
                    icon={<ReloadOutlined />}
                    onClick={refreshData}
                    loading={loading}
                >
                    Refresh
                </Button>
            }
            style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}
        >
            <div style={{ 
                overflowX: 'auto',
                overflowY: 'hidden',
                whiteSpace: 'nowrap',
                padding: '16px 0',
                scrollBehavior: 'smooth',
                maxWidth: '100%'
            }}>
                <List
                    dataSource={bids}
                    loading={loading}
                    style={{ 
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'nowrap',
                        width: 'max-content',
                        minWidth: '100%'
                    }}
                    renderItem={bid => {
                        const auction = auctionMetadata[bid.auctionId];
                        const shortAuctionId = `${bid.auctionId.substring(0, 10)}..`;
                        const shortBidId = `${bid.id.substring(0, 10)}..`;
                        const isPrivate = !bid.name;

                        return (
                            <div style={{ 
                                display: 'inline-block',
                                width: '300px',
                                marginRight: '16px',
                                verticalAlign: 'top'
                            }}>
                                <Card size="small" style={{ height: '100%', minHeight: '120px' }}>
                                    <Row align="middle" gutter={16}>
                                        {auction && (
                                            <Col span={8}>
                                                <img 
                                                    src={auction.image} 
                                                    alt="Auction item"
                                                    style={{ 
                                                        width: '100%',
                                                        height: '50px',
                                                        objectFit: 'cover',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                            </Col>
                                        )}
                                        <Col span={auction ? 16 : 24}>
                                            <Space direction="vertical" size={0}>
                                                {bid.name && (
                                                    <Text strong ellipsis>
                                                        Auction: {convertFieldToString(bid.name).substring(0,16) + ".."}
                                                    </Text>
                                                )}
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Auction ID: {shortAuctionId}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                                    Bid ID: {shortBidId}
                                                </Text>
                                                <Text strong>
                                                    {bid.amount / 1_000_000} ALEO
                                                </Text>
                                                {isPrivate && (
                                                    <Tag color="red">Private Auction</Tag>
                                                )}
                                            </Space>
                                        </Col>
                                    </Row>
                                </Card>
                            </div>
                        );
                    }}
                    locale={{ emptyText: 'No active bids found' }}
                />
            </div>
        </Card>
    );
}; 