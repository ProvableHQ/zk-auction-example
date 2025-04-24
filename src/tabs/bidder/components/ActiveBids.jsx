import React, { useState, useEffect } from 'react';
import { List, Card, Typography, Space, Button, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import { filterVisibility } from '../../../core/processing';
import { fieldsToString } from '../../../core/encoder';

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

    useEffect(() => {
        // Update the auction state when the component mounts
        updateAuctionStateOnConnect().then(() => {
            processBidData();
        });
    }, []);

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
        >
            <List
                grid={{ gutter: 16, column: 1 }}
                dataSource={bids}
                loading={loading}
                style={{ 
                    maxHeight: '600px', 
                    overflowY: 'auto',
                    scrollBehavior: 'smooth'
                }}
                renderItem={bid => {
                    const auction = auctionMetadata[bid.auctionId];
                    const shortAuctionId = `${bid.auctionId.substring(0, 20)}...field`;

                    return (
                        <List.Item>
                            <Card size="small">
                                <Row align="middle" gutter={16}>
                                    {auction && (
                                        <Col span={4}>
                                            <img 
                                                src={auction.image} 
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
                                    <Col span={auction ? 20 : 24}>
                                        <Space direction="vertical" size={0}>
                                            <Text strong>
                                                Bid Amount: {bid.amount / 1_000_000} ALEO
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Auction ID: {shortAuctionId}
                                            </Text>
                                            {bid.name && (
                                                <Text type="secondary">
                                                    Auction: {bid.name}
                                                </Text>
                                            )}
                                        </Space>
                                    </Col>
                                </Row>
                            </Card>
                        </List.Item>
                    );
                }}
                locale={{ emptyText: 'No active bids found' }}
            />
        </Card>
    );
}; 