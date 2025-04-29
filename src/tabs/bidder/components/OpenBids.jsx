import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Row, Col, Space, Tag, Select, Radio, Tabs, message, Modal, Dropdown, Menu } from 'antd';
import { ReloadOutlined, CheckCircleOutlined, TrophyOutlined, DownOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAuctionState } from '../../../components/AuctionState.jsx';
import {WalletMultiButton} from "@demox-labs/aleo-wallet-adapter-reactui";

const { Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;

export const OpenBids = () => {
    // Define local state.
    const [loading, setLoading] = useState(false);
    const [bids, setBids] = useState({});
    const [filteredBids, setFilteredBids] = useState({});
    const [redeemingBid, setRedeemingBid] = useState(null);
    const [redemptionModalVisible, setRedemptionModalVisible] = useState(false);
    const [selectedBid, setSelectedBid] = useState(null);
    
    // Filter states
    const [auctionStatus, setAuctionStatus] = useState('all'); 
    const [bidType, setBidType] = useState('all'); 
    const [auctionType, setAuctionType] = useState('all');
    const [bidStatus, setBidStatus] = useState('all');
    const [viewMode, setViewMode] = useState('list');

    // Get info from hooks.
    const { connected, publicKey } = useWallet();
    const { auctionState, addAuctionMetadataToBids, getUserBids, updateAuctionState } = useAuctionState();

    // Process bid data whenever the auction state changes.
    const processBidData = async () => {
        const userBids = getUserBids();
        const bidsWithMetadata = await addAuctionMetadataToBids(userBids);
        setBids(bidsWithMetadata);
        applyFilters(bidsWithMetadata);
    };

    // Apply filters to the bids
    const applyFilters = (bidsToFilter) => {
        let filtered = { ...bidsToFilter };
        
        // Filter by auction status
        if (auctionStatus !== 'all') {
            filtered = Object.fromEntries(
                Object.entries(filtered).filter(([_, bid]) => 
                    auctionStatus === 'open' ? bid.isAuctionActive : !bid.isAuctionActive
                )
            );
        }
        
        // Filter by bid type
        if (bidType !== 'all') {
            filtered = Object.fromEntries(
                Object.entries(filtered).filter(([_, bid]) => 
                    bidType === 'public' ? bid.isPublic : !bid.isPublic
                )
            );
        }
        
        // Filter by auction type
        if (auctionType !== 'all') {
            filtered = Object.fromEntries(
                Object.entries(filtered).filter(([_, bid]) => 
                    auctionType === 'public' ? bid.isAuctionPublic : !bid.isAuctionPublic
                )
            );
        }
        
        // Filter by bid status (winning or not)
        if (bidStatus !== 'all') {
            filtered = Object.fromEntries(
                Object.entries(filtered).filter(([_, bid]) => 
                    bidStatus === 'winning' ? bid.winner : !bid.winner
                )
            );
        }
        
        setFilteredBids(filtered);
    };

    // Update filters when they change
    useEffect(() => {
        applyFilters(bids);
    }, [auctionStatus, bidType, auctionType, bidStatus]);

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

    // Check if a bid has an associated auction invite
    const hasAuctionInvite = (bid) => {
        // This would check if there's an AuctionInvite record for this bid
        // For now, we'll simulate this check
        return auctionState.bidInvites && 
               auctionState.bidInvites.some(invite => invite.auction_id === bid.auctionId);
    };

    // Handle bid redemption
    const handleRedeemBid = (bid) => {
        if (!connected || !publicKey) {
            message.error('Please connect your wallet first');
            return;
        }

        setSelectedBid(bid);
        setRedemptionModalVisible(true);
    };

    // Execute the redemption based on the selected method
    const executeRedemption = async (redemptionMethod) => {
        if (!selectedBid) return;
        
        setRedeemingBid(selectedBid.id);
        setRedemptionModalVisible(false);
        
        try {
            // Here you would call the actual redemption function based on the method
            // For example:
            // if (redemptionMethod === 'public') {
            //     await redeemBidPublic(selectedBid.auctionId, selectedBid.id);
            // } else if (redemptionMethod === 'private_to_public') {
            //     await redeemBidPrivateToPublic(selectedBid.auctionId, selectedBid.id);
            // } else if (redemptionMethod === 'private') {
            //     await redeemBidPrivate(selectedBid.auctionId, selectedBid.id);
            // }
            
            // For now, we'll just simulate a successful redemption
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            message.success(`Bid successfully redeemed using ${redemptionMethod} method!`);
            
            // Refresh the data to update the UI
            await refreshData();
        } catch (error) {
            console.error('Error redeeming bid:', error);
            message.error('Failed to redeem bid. Please try again.');
        } finally {
            setRedeemingBid(null);
            setSelectedBid(null);
        }
    };

    // Render the redemption options modal
    const renderRedemptionModal = () => {
        if (!selectedBid) return null;
        
        const isPublicAuction = selectedBid.isAuctionPublic;
        const hasInvite = hasAuctionInvite(selectedBid);
        
        return (
            <Modal
                title="Select Redemption Method"
                visible={redemptionModalVisible}
                onCancel={() => {
                    setRedemptionModalVisible(false);
                    setSelectedBid(null);
                }}
                footer={null}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>Please select a redemption method for your winning bid:</Text>
                    
                    {isPublicAuction && (
                        <>
                            <Button 
                                type="primary" 
                                block 
                                onClick={() => executeRedemption('public')}
                            >
                                Redeem Publicly
                            </Button>
                            
                            <Button 
                                block 
                                onClick={() => executeRedemption('private_to_public')}
                            >
                                Redeem Privately (Transfer to Public Address)
                            </Button>
                        </>
                    )}
                    
                    {hasInvite && (
                        <Button 
                            block 
                            onClick={() => executeRedemption('private')}
                        >
                            Redeem Privately
                        </Button>
                    )}
                    
                    {!isPublicAuction && !hasInvite && (
                        <Text type="danger">
                            No valid redemption methods available for this bid.
                        </Text>
                    )}
                </Space>
            </Modal>
        );
    };

    // Group bids by auction
    const getGroupedBids = () => {
        const grouped = {};
        Object.values(filteredBids).forEach(bid => {
            if (!grouped[bid.auctionId]) {
                grouped[bid.auctionId] = {
                    auctionId: bid.auctionId,
                    name: bid.auctionName,
                    image: bid.metadata?.image,
                    isAuctionPublic: bid.isAuctionPublic,
                    isAuctionActive: bid.isAuctionActive,
                    bids: []
                };
            }
            grouped[bid.auctionId].bids.push(bid);
        });
        return grouped;
    };

    const renderBidCard = (bid) => {
        const shortAuctionId = `${bid.auctionId.substring(0, 20)}...field`;
        const shortBidId = `${bid.id.substring(0, 20)}...field`;
        const auctionImage = bid?.metadata?.image;
        const isRedeemable = bid.winner && !bid.redeemed;

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
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Bid ID: {shortBidId}
                            </Text>
                            {bid.auctionName && (
                                <Text type="secondary">
                                    Auction: {bid.auctionName}
                                </Text>
                            )}
                            <Space>
                                <Tag color={bid.isAuctionPublic ? 'green' : 'red'}>
                                    {bid.isAuctionPublic ? 'Public Auction' : 'Private Auction'}
                                </Tag>
                                <Tag color={bid.isPublic ? 'blue' : 'purple'}>
                                    {bid.isPublic ? 'Public' : 'Private'} Bid
                                </Tag>
                                <Tag color={bid.isAuctionActive ? 'green' : 'red'}>
                                    {bid.isAuctionActive ? 'Open' : 'Closed'}
                                </Tag>
                                {bid.winner && (
                                    <Tag color='green'>
                                        {'Winner'}
                                    </Tag>
                                )}
                                {bid.redeemed && (
                                    <Tag color='gold' icon={<CheckCircleOutlined />}>
                                        {'Redeemed'}
                                    </Tag>
                                )}
                            </Space>
                            
                            {isRedeemable && (
                                <Button 
                                    type="primary" 
                                    size="small" 
                                    style={{ marginTop: 8 }}
                                    loading={redeemingBid === bid.id}
                                    onClick={() => handleRedeemBid(bid)}
                                >
                                    Redeem Bid
                                </Button>
                            )}
                        </Space>
                    </Col>
                </Row>
            </Card>
        );
    };

    const renderGroupedBids = () => {
        const grouped = getGroupedBids();
        return Object.values(grouped).map(group => (
            <Card 
                key={group.auctionId} 
                title={
                    <Space>
                        <Text strong>{group.name || 'Unnamed Auction'}</Text>
                        <Tag color={group.isAuctionPublic ? 'green' : 'red'}>
                            {group.isAuctionPublic ? 'Public Auction' : 'Private Auction'}
                        </Tag>
                        <Tag color={group.isAuctionActive ? 'green' : 'red'}>
                            {group.isAuctionActive ? 'Open' : 'Closed'}
                        </Tag>
                    </Space>
                }
                style={{ marginBottom: 16 }}
            >
                {group.bids.map(bid => renderBidCard(bid))}
            </Card>
        ));
    };

    return (
        <Card
            title="Your Bids"
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
            {!connected ? (
                <WalletMultiButton />
            ) : (
                <>
                    <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col span={6}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={auctionStatus}
                                    onChange={setAuctionStatus}
                                    placeholder="Auction Status"
                                >
                                    <Option value="all">All Auctions</Option>
                                    <Option value="open">Open Auctions</Option>
                                    <Option value="closed">Closed Auctions</Option>
                                </Select>
                            </Col>
                            <Col span={6}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={bidType}
                                    onChange={setBidType}
                                    placeholder="Bid Type"
                                >
                                    <Option value="all">All Bids</Option>
                                    <Option value="public">Public Bids</Option>
                                    <Option value="private">Private Bids</Option>
                                </Select>
                            </Col>
                            <Col span={6}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={auctionType}
                                    onChange={setAuctionType}
                                    placeholder="Auction Type"
                                >
                                    <Option value="all">All Auction Types</Option>
                                    <Option value="public">Public Auctions</Option>
                                    <Option value="private">Private Auctions</Option>
                                </Select>
                            </Col>
                            <Col span={6}>
                                <Select
                                    style={{ width: '100%' }}
                                    value={bidStatus}
                                    onChange={setBidStatus}
                                    placeholder="Bid Status"
                                    suffixIcon={<TrophyOutlined style={{ color: bidStatus === 'winning' ? '#52c41a' : undefined }} />}
                                >
                                    <Option value="all">All Bids</Option>
                                    <Option value="winning">Winning Bids</Option>
                                    <Option value="non-winning">Non-Winning Bids</Option>
                                </Select>
                            </Col>
                        </Row>
                        
                        <Radio.Group 
                            value={viewMode} 
                            onChange={e => setViewMode(e.target.value)}
                            style={{ marginTop: 8 }}
                        >
                            <Radio.Button value="list">List View</Radio.Button>
                            <Radio.Button value="grouped">Group by Auction</Radio.Button>
                        </Radio.Group>
                    </Space>

                    {viewMode === 'list' ? (
                        <List
                            dataSource={Object.values(filteredBids)}
                            renderItem={bid => renderBidCard(bid)}
                            locale={{ emptyText: 'No bids found matching the filters' }}
                        />
                    ) : (
                        renderGroupedBids()
                    )}
                    
                    {renderRedemptionModal()}
                </>
            )}
        </Card>
    );
}; 