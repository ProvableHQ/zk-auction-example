import React from 'react';
import { Card } from 'antd';
import { ActiveBids } from './components/ActiveBids';

export const BidFeed = () => {
    return (
        <Card style={{ width: '100%', minHeight: '200px' }}>
            <ActiveBids style={{ width: '100%', minHeight: '200px' }} />
        </Card>
    );
};