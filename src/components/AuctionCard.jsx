import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Image, Statistic, Typography, Tabs, List, Button, Space, Tag, Divider } from 'antd';
import { convertFieldToString, privacySetting } from '../core/encoder.js';
import { filterVisibility as f} from '../core/processing.js';
import { BidForm } from './BidForm';
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { InviteForm } from './InviteForm';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { PROGRAM_ID } from '../core/constants';
import { useAuctionState } from './AuctionState.jsx';
import { AuctionStatusTags } from './AuctionStatusTags.jsx';
import { AuctionBidCard } from './AuctionBidCard.jsx';
import {EventType, requestCreateEvent} from "@puzzlehq/sdk-core";
import {createTransaction} from "../core/transaction.js";

const { Title, Text } = Typography;
const { TabPane } = Tabs;

export const AuctionCard = ({ auctionId, data, loading }) => {
    // Local State Variables
    const [metadata, setMetadata] = useState({ image: '', name: '' });
    const [bidFormVisible, setBidFormVisible] = useState(false);
    const [bidType, setBidType] = useState(null);
    const [inviteFormVisible, setInviteFormVisible] = useState(false);
    const {connected, wallet} = useWallet();

    // Local hooks.
    const { publicKey, requestTransaction } = useWallet();
    const { auctionState, findHighestBid, getAuctionBids, getAuctionMetadata } = useAuctionState();
    const acceptsPublicBids = data.bidTypes === '1field' || data.bidTypes === '2field';

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const json = JSON.parse(await getAuctionMetadata(auctionId));
                setMetadata({ image: json.image, name: json.name });
            } catch (err) {
                console.warn('Error fetching metadata for auction', auctionId, err);
            }
        };
        fetchMetadata();
    }, [auctionId]);

    const showBidForm = (type) => {
        setBidType(type);
        setBidFormVisible(true);
    };

    const handleBidFormCancel = () => {
        setBidFormVisible(false);
        setBidType(null);
    };

    const isOwner = () => {
        return data.auctioneer === publicKey;
    };

    const privateBids = () => {
        return getAuctionBids(auctionId).filter(bid => !bid.isPublic);
    };

    const publicBids = () => {
        return getAuctionBids(auctionId).filter(bid => bid.isPublic);
    }

    const handleSelectWinner = async (bid, isPrivate) => {
        try {
            const inputs = isPrivate ?
                // Inputs for private winner selection
                [
                    data.activeTicket,     // Use original AuctionTicket record
                    auctionState.privateBids.filter(privateBid => {
                        return (f(privateBid.data.bid.auction_id) === bid.auctionId && f(privateBid.data.bid_id) === bid.id)
                    })[0],
                ] :
                // Inputs for public winner selection
                [
                    data.activeTicket,     // Use original AuctionTicket record
                    `{\n  amount: ${bid.amount}u64,\n  auction_id: ${bid.auctionId},\n  bid_public_key: ${bid.publicKey}\n}`, // Use original PublicBid record
                    bid.id,          // winning_bid_id
                ];
            const functionName = isPrivate ? 'select_winner_private' : 'select_winner_public';

            if (wallet?.adapter?.name === "Puzzle Wallet") {
                const params = {type: EventType.Execute, programId: PROGRAM_ID, functionId: functionName, fee: .1, inputs}
                await createTransaction(params, requestCreateEvent, wallet?.adapter?.name);
            } else {
                const params = {publicKey, functionName, inputs, fee: 100000, feePrivate: false};
                await createTransaction(params, requestTransaction, wallet?.adapter?.name);
            }
        } catch (error) {
            console.error('Error selecting winner:', error);
        }
    };

    return (
        <Card
            key={auctionId}
            style={{ width: '100%', marginBottom: '16px' }}
            loading={loading}
        >
            <Row align="middle" style={{ marginBottom: 8 }}>
                <Col flex="auto">
                    <Space size="middle" align="center">
                        <Title level={4} style={{ margin: 0 }}>{convertFieldToString(data.name)}</Title>
                        <AuctionStatusTags data={data} isOwner={isOwner()} />
                    </Space>
                </Col>
            </Row>
            <Row style={{ marginBottom: 8 }}>
                <Col>
                    <Text type="secondary">Auction ID: {auctionId.substring(0,20) + "..."}</Text>
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
                    {data.auctioneer && (
                        <Typography.Text type="secondary" style={{ 
                            display: 'block', 
                            textAlign: 'center',
                            wordBreak: 'break-all',
                            marginTop: '8px'
                        }}>
                            Auctioneer: {data.auctioneer}
                        </Typography.Text>
                    )}
                    <div style={{ marginTop: '16px' }}>
                        { isOwner() && (
                            <Button
                                type="primary"
                                block
                                onClick={() => setInviteFormVisible(true)}
                            >
                                Invite to Bid
                            </Button>
                        )}
                    </div>
                </Col>
                <Col span={16}>
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Row gutter={[16, 16]}>
                                <Col span={8}>
                                    <Statistic title="Starting Bid" value={data.startingBid / 1_000_000.0} suffix="ALEO" />
                                </Col>
                                <Col span={8}>
                                    <Statistic 
                                        title="Highest Bid" 
                                        value={findHighestBid(auctionId) / 1_000_000}
                                        suffix="ALEO" 
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Bid Types" value={privacySetting(data.bidTypes)} />
                                </Col>
                            </Row>
                            <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
                                <Col span={8}>
                                    {isOwner() ? (
                                        <Statistic title="Private Bids" value={privateBids().length} />
                                    ) : (
                                        <Statistic
                                            title="Private Bids"
                                            value="🔒"
                                            suffix={<span style={{ color: '#999' }}>Private</span>}
                                        />
                                    )}
                                </Col>
                                <Col span={8}>
                                    <Statistic
                                        title="Your Private Bids"
                                        value={privateBids().length}
                                    />
                                </Col>
                                <Col span={8}>
                                    <Statistic title="Public Bids" value={publicBids().length} />
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                    
                    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <Row gutter={[8, 8]} justify="end">
                            {!data.winner && (data.bidTypes === '0field' || data.bidTypes === '2field') && (
                                <Col>
                                    <Button
                                        type="primary"
                                        onClick={() => showBidForm('private')}
                                    >
                                        Bid Privately
                                    </Button>
                                </Col>
                            )}
                            {!data.winner && (data.bidTypes  === '1field' || data.bidTypes === '2field') && (
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
                    </div>

                    <Tabs defaultActiveKey="1">
                        <TabPane tab="Private Bids" key="1">
                            {isOwner() ? (
                                <List
                                    dataSource={privateBids()}
                                    renderItem={bid => (
                                        <AuctionBidCard
                                            bid={bid}
                                            isOwner={isOwner()}
                                            isPrivate={true}
                                            isActive={auctionState?.auctions[auctionId]?.active}
                                            handleSelectWinner={handleSelectWinner}
                                            highestBidAmount={findHighestBid(auctionId)}
                                        />
                                    )}
                                    locale={{ emptyText: 'No private bids yet' }}
                                />
                            ) : (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                                    🔐 This auction's private bids are only visible to the auction owner.
                                </div>
                            )}
                        </TabPane>

                        <TabPane tab="Your Private Bids" key="2">
                            <List
                                dataSource={privateBids()}
                                renderItem={bid => (
                                    <AuctionBidCard
                                        bid={bid}
                                        isOwner={isOwner()}
                                        isPrivate={true}
                                        isActive={auctionState?.auctions[auctionId]?.active}
                                        handleSelectWinner={handleSelectWinner}
                                        highestBidAmount={findHighestBid(auctionId)}
                                    />
                                )}
                                locale={{ emptyText: '🔐 You haven\'t made any private bids on this auction' }}
                            />
                        </TabPane>

                        {acceptsPublicBids ? (
                            <TabPane tab="Public Bids" key="3">
                                <List
                                    dataSource={publicBids()}
                                    renderItem={bid => (
                                        <AuctionBidCard
                                            bid={bid}
                                            isOwner={isOwner()}
                                            isPrivate={false}
                                            isActive={auctionState?.auctions[auctionId]?.active}
                                            handleSelectWinner={handleSelectWinner}
                                            highestBidAmount={findHighestBid(auctionId)}
                                        />
                                    )}
                                    locale={{ emptyText: 'No public bids yet' }}
                                />
                            </TabPane>
                        ) : (
                            <TabPane tab="Public Bids 🚫" key="3" disabled>
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                                    This auction only accepts private bids. Public bids are disabled to preserve bidder privacy 🕵️‍♂️
                                </div>
                            </TabPane>
                        )}
                    </Tabs>
                </Col>
            </Row>

            <BidForm
                visible={bidFormVisible}
                onCancel={handleBidFormCancel}
                auctionData={data}
                bidType={bidType}
            />

            {connected && <InviteForm
                visible={inviteFormVisible}
                onCancel={() => setInviteFormVisible(false)}
                ticketRecord={data.activeTicket}
            />}
        </Card>
    );
};
