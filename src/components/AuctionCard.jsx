import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Image, Statistic, Typography, Tabs, List, Button, Space, Tag, Divider } from 'antd';
import { convertFieldToString, fieldsToString } from '../core/encoder.js';
import { filterVisibility as f} from '../core/processing.js';
import { BidForm } from './BidForm';
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { InviteForm } from './InviteForm';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { PROGRAM_ID } from '../core/constants';
import { useAuctionState } from './AuctionState.jsx';


const { Title, Text } = Typography;
const { TabPane } = Tabs;

export const AuctionCard = ({ auctionId, data, loading }) => {
    const { publicKey, requestTransaction } = useWallet();

    console.log("AuctionCard data:", data);

    const auctionName = convertFieldToString(data.name);
    const itemMetadata = data.metadata;
    const bidTypesAccepted = data.bidTypes;
    const startingBid = data.startingBid;
    const isPublic = data.isPublic;
    const auctioneer = data.auctioneer;
    const matchingPrivateBids = data.privateBids.filter(bid => bid.auctionId === auctionId);
    const publicBids = data.publicBids;
    const totalBids = (data.privateBids?.length || 0) + (data.publicBids?.length || 0);
    const ticketRecord = data.ticketRecord;
    const displayId = data.displayId || auctionId.substring(0, 20) + '...';

    console.log('Matching private bids:', matchingPrivateBids);

    const [metadata, setMetadata] = useState({ image: '', name: '' });
    const [bidFormVisible, setBidFormVisible] = useState(false);
    const [bidType, setBidType] = useState(null);
    const [inviteFormVisible, setInviteFormVisible] = useState(false);
    const { auctionState } = useAuctionState();

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const metadataUrl = fieldsToString(
                    itemMetadata.map(image =>
                        BigInt(f(image).replace('field', ''))
                    )
                );
                const res = await fetch(metadataUrl);
                const json = await JSON.parse(await res.json());
                setMetadata({ image: json.image, name: json.name });
            } catch (err) {
                console.warn('Error fetching metadata for auction', auctionId, err);
            }
        };
        fetchMetadata();
    }, [auctionId]);

    const getBidTypeLabel = (bidType) => {
        switch (bidType) {
            case '0field':
                return 'Private Only';
            case '1field':
                return 'Public Only';
            case '2field':
                return 'Private & Public';
            default:
                return 'Unknown';
        }
    };

    const showBidForm = (type) => {
        setBidType(type);
        setBidFormVisible(true);
    };

    const handleBidFormCancel = () => {
        setBidFormVisible(false);
        setBidType(null);
    };

    const isOwner = () => {
        return auctioneer === publicKey;
    };

    const renderBidButtons = () => {
        return (
            <Row gutter={[8, 8]} justify="end">
                {(bidTypesAccepted === '0field' || bidTypesAccepted === '2field') && (
                    <Col>
                        <Button 
                            type="primary"
                            onClick={() => showBidForm('private')}
                        >
                            Bid Privately
                        </Button>
                    </Col>
                )}
                {(bidTypesAccepted === '1field' || bidTypesAccepted === '2field') && (
                    <Col>
                        <Button 
                            type="default"
                            onClick={() => showBidForm('public')}
                        >
                            Bid Publicly
                        </Button>
                    </Col>
                )}
            </Row>
        );
    };

    const renderOwnerButtons = () => {
        if (isOwner()) {
            return (
                <Button 
                    type="primary"
                    block
                    onClick={() => setInviteFormVisible(true)}
                >
                    Invite to Bid
                </Button>
            );
        }
        return null;
    };

    const findHighestBidAmount = () => {
        let highestAmount = 0;
        
        // Check public bids
        publicBids.forEach(bid => {
            const amount = parseInt(bid.amount);
            if (amount > highestAmount) {
                highestAmount = amount;
            }
        });

        // Check private bids
        matchingPrivateBids.forEach(bid => {
            const amount = parseInt(bid.amount);
            if (amount > highestAmount) {
                highestAmount = amount;
            }
        });

        return highestAmount;
    };

    const handleSelectWinner = async (bid, isPrivate) => {
        try {
            console.log("privateBids", auctionState.privateBids);
            const inputs = isPrivate ? 
                // Inputs for private winner selection
                [
                    ticketRecord,     // Use original AuctionTicket record
                    auctionState.privateBids.filter(privateBid => {
                        return (f(privateBid.data.bid.auction_id) === bid.auctionId && f(privateBid.data.bid_id) === bid.id)
                    })[0],
                ] :
                // Inputs for public winner selection
                [
                    ticketRecord,     // Use original AuctionTicket record
                    `{\n  amount: ${bid.amount}u64,\n  auction_id: ${bid.auctionId},\n  bid_public_key: ${bid.publicKey}\n}`, // Use original PublicBid record
                    bid.id,          // winning_bid_id
                ];
            
            console.log('Inputs:', inputs);

            const transaction = Transaction.createTransaction(
                publicKey,
                WalletAdapterNetwork.TestnetBeta,
                PROGRAM_ID,
                isPrivate ? 'select_winner_private' : 'select_winner_public',
                inputs,
                0.276, // Fee in credits
                false,
            );

            const result = await requestTransaction(transaction);
            console.log(`${isPrivate ? 'Private' : 'Public'} winner selection transaction:`, result);
        } catch (error) {
            console.error('Error selecting winner:', error);
        }
    };

    const renderBidCard = (bid, isPrivate = true) => {
        const bidAmount = parseInt(bid.amount);
        const isHighestBid = bidAmount === findHighestBidAmount();

        console.log('Bid:', bid);
        console.log('Is private:', isPrivate);
        
        return (
            <Card size="small" style={{ marginBottom: '8px' }}>
                <Row justify="space-between" align="middle">
                    <Col>
                        <Space direction="vertical" size={0}>
                            <Text>Bid Amount: {bidAmount / 1_000_000} ALEO</Text>
                            <Text type="secondary">
                                Bid ID: {bid.id.substring(0, 21)}..
                            </Text>
                            {isHighestBid && (
                                <Tag color="#87d068">Highest Bid</Tag>
                            )}
                        </Space>
                    </Col>
                    <Col>
                        {isOwner() && isHighestBid && (
                            <Button 
                                type="primary"
                                size="small"
                                onClick={() => handleSelectWinner(bid, isPrivate)}
                            >
                                Select Winner
                            </Button>
                        )}
                    </Col>
                </Row>
            </Card>
        );
    };

    const renderStatusTags = () => (
        <Space>
            <Tag color={isPublic ? '#1890ff' : '#f50'}>
                {isPublic ? 'Public Auction' : 'Private Auction'}
            </Tag>
            {isOwner() && (
                <Tag color="#52c41a">Your Auction</Tag>
            )}
        </Space>
    );

    return (
        <Card
            key={auctionId}
            style={{ width: '100%', marginBottom: '16px' }}
            loading={loading}
        >
            <Row align="middle" style={{ marginBottom: 8 }}>
                <Col flex="auto">
                    <Space size="middle" align="center">
                        <Title level={4} style={{ margin: 0 }}>{auctionName}</Title>
                        {renderStatusTags()}
                    </Space>
                </Col>
            </Row>
            <Row style={{ marginBottom: 8 }}>
                <Col>
                    <Text type="secondary">Auction ID: {displayId}</Text>
                </Col>
            </Row>
            <Divider style={{ margin: '0 0 16px 0' }} />

            <Row gutter={[16, 16]}>
                <Col span={8}>
                    <Image
                        src={metadata.image || null}
                        alt={metadata.name}
                        style={{ width: '100%', borderRadius: '8px' }}
                        fallback="https://via.placeholder.com/150"
                    />
                    <Title level={5} style={{ marginTop: '8px', textAlign: 'center' }}>
                        {metadata.name}
                    </Title>
                    {auctioneer && (
                        <Typography.Text type="secondary" style={{ 
                            display: 'block', 
                            textAlign: 'center',
                            wordBreak: 'break-all',
                            marginTop: '8px'
                        }}>
                            Auctioneer: {auctioneer}
                        </Typography.Text>
                    )}
                    <div style={{ marginTop: '16px' }}>
                        {renderOwnerButtons()}
                    </div>
                </Col>
                <Col span={16}>
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Row gutter={[16, 16]}>
                                <Col span={8}>
                                    <Statistic title="Starting Bid" value={startingBid / 1_000_000.0} suffix="ALEO" />
                                </Col>
                                <Col span={8}>
                                    <Statistic 
                                        title="Highest Bid" 
                                        value={findHighestBidAmount() / 1_000_000} 
                                        suffix="ALEO" 
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Bid Types" value={getBidTypeLabel(bidTypesAccepted)} />
                                </Col>
                            </Row>
                            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                                <Col span={8}>
                                    <Statistic title="Private Bids" value={matchingPrivateBids.length || totalBids - publicBids.length} />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Public Bids" value={publicBids.length} />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Total Bids" value={totalBids} />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                        {renderBidButtons()}
                    </div>

                    <Tabs defaultActiveKey="1">
                        <TabPane tab="Private Bids" key="1">
                            <List
                                dataSource={matchingPrivateBids}
                                renderItem={bid => renderBidCard(bid, true)}
                                locale={{ emptyText: 'No private bids yet' }}
                            />
                        </TabPane>
                        <TabPane tab="Public Bids" key="2">
                            <List
                                dataSource={publicBids}
                                renderItem={bid => renderBidCard(bid, false)}
                                locale={{ emptyText: 'No public bids yet' }}
                            />
                        </TabPane>
                    </Tabs>
                </Col>
            </Row>

            <BidForm
                visible={bidFormVisible}
                onCancel={handleBidFormCancel}
                auctionData={data}
                bidType={bidType}
            />
            
            <InviteForm
                visible={inviteFormVisible}
                onCancel={() => setInviteFormVisible(false)}
                ticketRecord={ticketRecord}
            />
        </Card>
    );
};
