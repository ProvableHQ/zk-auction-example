// StatusTags.jsx
import React from 'react';
import { Tag, Space } from 'antd';
import { CheckOutlined } from '@ant-design/icons';

export const AuctionStatusTags = ({ data, isOwner }) => {
    return (
        <Space>
            <Tag color={data.isPublic ? '#1890ff' : '#f50'}>
                {data.isPublic ? 'Public Auction' : 'Private Auction'}
            </Tag>
            {isOwner && (
                <Tag color="#52c41a">Your Auction</Tag>
            )}
            {!data.active && (
                <Tag color="#f56042" icon={<CheckOutlined />}>
                    Bidding Closed
                </Tag>
            )}
        </Space>
    );
};
