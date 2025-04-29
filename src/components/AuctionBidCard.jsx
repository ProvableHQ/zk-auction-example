// BidCard.jsx
import React from 'react';
import { Card, Row, Col, Button, Space, Typography, Tag } from 'antd';

const { Text } = Typography;

export const AuctionBidCard = ({ bid, isOwner, isPrivate, isActive, handleSelectWinner, highestBidAmount }) => {
    const bidAmount = parseInt(bid.amount);
    const isHighestBid = bidAmount === highestBidAmount;
    const isWinner = !!bid.winner;

    return (
        <Card size="small" style={{ marginBottom: '8px' }}>
            <Row justify="space-between" align="middle">
                <Col>
                    <Space direction="vertical" size={0}>
                        <Text>Bid Amount: {bidAmount / 1_000_000} ALEO</Text>
                        <Text type="secondary">
                            Bid ID: {bid.id.substring(0, 21)}..
                        </Text>
                        {!isWinner && isHighestBid && (
                            <Tag color="#87d068">Highest Bid</Tag>
                        )}
                        {isWinner && (
                            <Tag color="#87d068">Winner</Tag>
                        )}
                    </Space>
                </Col>
                <Col>
                    {!isWinner && isOwner && isHighestBid && isActive && (
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
