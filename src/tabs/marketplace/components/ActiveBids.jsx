import React, { useState, useEffect } from 'react';
import {List, Card, Typography, Space, Button, Row, Col, Tag} from 'antd';
import {EyeInvisibleOutlined, LockOutlined, ReloadOutlined} from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import { filterVisibility } from '../../../core/processing';
import {convertFieldToString, fieldsToString} from '../../../core/encoder';

const { Text } = Typography;

export const ActiveBids = () => {
    const { publicKey } = useWallet();
    const { auctionState, addAuctionMetadataToBids, updatePublicAuctionState } = useAuctionState();
    const [loading, setLoading] = useState(false);
    const [bids, setBids] = useState([]);

    const refreshData = async () => {
        setLoading(true);
        try {
            // Update the public state
            await updatePublicAuctionState();
            // Process the updated state
            setBids(await addAuctionMetadataToBids(auctionState.bids || {}));
        } catch (error) {
            console.error('Error refreshing bid data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Process bid data whenever the auction state changes
    useEffect(() => {
        addAuctionMetadataToBids(auctionState.bids || {}).then(bids => setBids(bids));
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
                    dataSource={Object.values(bids)}
                    loading={loading}
                    style={{ 
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'nowrap',
                        width: 'max-content',
                        minWidth: '100%'
                    }}
                    renderItem={bid => {
                        console.log('bid', bid);
                        const shortAuctionId = `${bid.auctionId.substring(0, 10)}..`;
                        const shortBidId = `${bid.id.substring(0, 10)}..`;
                        let auctionName = "";
                        const isPrivate = !bid.auctionName;
                        if (!isPrivate) {
                            auctionName = auctionName.substring(0,16) + "..";
                        }

                        return (
                            <div style={{ 
                                display: 'inline-block',
                                width: '300px',
                                marginRight: '16px',
                                verticalAlign: 'top'
                            }}>
                                <Card size="small" style={{ height: '100%', minHeight: '120px' }}>
                                    <Row align="middle" gutter={16}>
                                        <Col span={8}>
                                            {bid.metadata?.image ? (
                                                <img
                                                    src={bid.metadata.image}
                                                    alt="Auction item"
                                                    style={{
                                                        width: '100%',
                                                        height: '50px',
                                                        objectFit: 'cover',
                                                        borderRadius: '4px'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    width: '100%',
                                                    height: '50px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: '#f0f0f0',
                                                    borderRadius: '4px'
                                                }}>
                                                    <LockOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />
                                                </div>
                                            )}
                                        </Col>
                                        <Col span={bid ? 16 : 24}>
                                            <Space direction="vertical" size={0}>
                                                {bid.name && (
                                                    <Text strong ellipsis>
                                                        Auction: {auctionName}
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
                                                <Space direction="horizontal" size={0}>
                                                {publicKey && (auctionState.bids[bid.id]?.owner === publicKey) && (
                                                    <Tag color="#87d068">Your Bid</Tag>
                                                )}
                                                {isPrivate && (
                                                    <Tag color="red">Private Auction</Tag>
                                                )}
                                                </Space>
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