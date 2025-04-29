import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Row, Col, Space, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import { filterVisibility } from '../../../core/processing';
import {convertFieldToString, fieldsToString} from '../../../core/encoder';

const { Text } = Typography;

export const OpenBids = () => {
    // Define local state.
    const [loading, setLoading] = useState(false);
    const [bids, setBids] = useState({});

    // Get info from hooks.
    const { connected, publicKey } = useWallet();
    const { auctionState, addAuctionMetadataToBids, getUserBids, updateAuctionState } = useAuctionState();

    // Process bid data whenever the auction state changes.
    const processBidData = async () => {
        const userBids = getUserBids();
        const bidsWithMetadata = await addAuctionMetadataToBids(userBids);
       setBids(bidsWithMetadata);
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            // Update the private state
            if (connected) {
                await updateAuctionState(true);
            }
            // Process the updated state
            await processBidData();
        } catch (error) {
            console.error('Error refreshing bid data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Process bid data whenever the auction state changes
    useEffect(() => {
        processBidData();
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
                dataSource={Object.values(bids)}
                renderItem={bid => {
                    const shortAuctionId = `${bid.auctionId.substring(0, 20)}...field`;
                    const auctionImage = bid?.metadata?.image;
                    console.log("Auction image is", auctionImage);

                    return (
                        <Card size="small" style={{ marginBottom: 16 }}>
                            <Row align="middle" gutter={16}>
                                {auctionImage && (
                                    <Col span={4}>
                                        <img 
                                            src={auctionImage} 
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
                                <Col span={auctionImage ? 20 : 24}>
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
                                        <Space>
                                            <Tag color={bid.isAuctionPublic ? 'green' : 'red'}>
                                                {bid.isAuctionPublic ? 'Public Auction' : 'Private Auction'}
                                            </Tag>
                                            <Tag color={bid.isPublic ? 'blue' : 'purple'}>
                                                {bid.isPublic ? 'Public Bid' : 'Private Bid'} Bid
                                            </Tag>
                                            <Tag color={bid.isAuctionActive ? 'green' : 'red'}>
                                                {bid.isAuctionActive ? 'Open' : 'Closed'}
                                            </Tag>
                                            {bid.isWinner && (
                                                <Tag color='green'>
                                                    {'Winner'}
                                                </Tag>
                                            )
                                            }
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