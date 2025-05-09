import React, { useState, useEffect } from 'react';
import { Card, List, Button, Typography, Row, Col, Space, Tag, Select, Radio, Tabs, message } from 'antd';
import { ReloadOutlined, TrophyOutlined } from '@ant-design/icons';
import { UserBid } from '../../components/UserBid.jsx';
import { RedemptionModal } from '../../components/RedemptionModal.jsx';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { requestCreateEvent } from '@puzzlehq/sdk';
import { useAuctionState } from '../../components/AuctionState.jsx';
import {WalletMultiButton} from "@demox-labs/aleo-wallet-adapter-reactui";
import {createTransaction} from "../../core/transaction.js";
import {EventType} from "@puzzlehq/sdk-core";
import {PROGRAM_ID} from "../../core/constants.js";

const { Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export const MyBids = () => {
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
    const { connected, publicKey, requestTransaction, wallet } = useWallet();
    const { auctionState, addAuctionMetadataToBids, getUserBids, updateAuctionState, getBidReceipt, getAuctionInvite } = useAuctionState();

    // Process bid data whenever the auction state changes.
    const processBidData = async () => {
        const bidsWithMetadata = await addAuctionMetadataToBids(getUserBids());
        setBids(bidsWithMetadata);
        applyFilters(bidsWithMetadata);
    };

    // Apply filters to the bids
    const applyFilters = (bids) => {
        const filtered = Object.fromEntries(
            Object.entries(bids).filter(([_, bid]) =>
                (auctionStatus === 'all' || (auctionStatus === 'open') === bid.isAuctionActive) &&
                (bidType === 'all' || (bidType === 'public') === bid.isPublic) &&
                (auctionType === 'all' || (auctionType === 'public') === bid.isAuctionPublic) &&
                (bidStatus === 'all' || (bidStatus === 'winning') === bid.winner)
            )
        );
        setFilteredBids(filtered);
    };

    // Update filters when they change
    useEffect(() => {
        applyFilters(bids);
    }, [auctionState, auctionStatus, bidType, auctionType, bidStatus]);

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
            let functionName = '';
            let inputs = [];
            console.log("Selected bid for redemption", selectedBid);
            const bidReceipt = getBidReceipt(selectedBid.id);
            console.log("Selected bid receipt", bidReceipt);
            if (redemptionMethod === 'public') {
                functionName = 'redeem_bid_public';
                inputs = [auctionState.auctions[selectedBid.auctionId]?.auctioneer, bidReceipt];
            } else if (redemptionMethod === 'private_to_public') {
                functionName = 'redeem_bid_private_to_public';
                inputs = [auctionState.auctions[selectedBid.auctionId]?.auctioneer, bidReceipt, ''];
            } else if (redemptionMethod === 'private') {
                const auctionInvite = getAuctionInvite(selectedBid.auctionId);
                functionName = 'redeem_bid_private';
                inputs = [auctionInvite, bidReceipt, ''];
            }

            if (wallet?.adapter?.name === "Puzzle Wallet") {
                const params = {type: EventType.Execute, programId: PROGRAM_ID, functionId: functionName, fee: 0.25, inputs}
                await createTransaction(params, requestCreateEvent, wallet?.adapter?.name);
            } else {
                const params = {publicKey, functionName, inputs, fee: 250000, feePrivate: false};
                await createTransaction(params, requestTransaction, wallet?.adapter?.name);
            }

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
                    isWalletAccountOwner: auctionState.auctions[bid.auctionId]?.auctioneer === publicKey,
                    bids: []
                };
            }
            grouped[bid.auctionId].bids.push(bid);
        });
        return grouped;
    };

    const renderGroupedBids = () => {
        const grouped = getGroupedBids();
        return Object.values(grouped).map(group => (
            <Card 
                key={group.auctionId} 
                title={
                    <Space>
                        <Text strong>{group.name || 'Unnamed Auction'}</Text>
                        {group.isWalletAccountOwner && (
                                <Tag color={group.isWalletAccountOwner ? 'green' : 'red'}>
                                    {'Your Auction'}
                                </Tag>
                            )
                        }
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
                {group.bids.map(bid => <UserBid bid={bid} handleRedeemBid={handleRedeemBid} redeemingBid={redeemingBid} />)}
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
                            renderItem={bid => <UserBid bid={bid} handleRedeemBid={handleRedeemBid} redeemingBid={redeemingBid} />}
                            locale={{ emptyText: 'No bids found matching the filters' }}
                        />
                    ) : (
                        renderGroupedBids()
                    )}
                    
                    <RedemptionModal
                        visible={redemptionModalVisible}
                        onCancel={() => {
                            setRedemptionModalVisible(false);
                            setSelectedBid(null);
                        }}
                        onRedeem={executeRedemption}
                        selectedBid={selectedBid}
                        isPublicAuction={selectedBid?.isAuctionPublic}
                        hasInvite={selectedBid ? hasAuctionInvite(selectedBid) : false}
                    />
                </>
            )}
        </Card>
    );
}; 