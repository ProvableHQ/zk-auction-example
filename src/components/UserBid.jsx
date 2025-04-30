import React from "react";
import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";

const { Text } = Typography;

export const UserBid = ({ bid, handleRedeemBid, redeemingBid }) => {
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
}