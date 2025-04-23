import React from 'react';
import { Tabs, Card } from 'antd';
import { OpenBids } from './components/OpenBids';
import { ActiveBids } from './components/ActiveBids';

export const BidExplorer = () => {
    return (
        <Card style={{ width: '100%', minHeight: '200px' }}>
            <Tabs
                defaultActiveKey="1"
                items={[
                    {
                        key: '1',
                        label: 'Public Bid Feed',
                        children: <ActiveBids />,
                    },
                    {
                        key: '2',
                        label: 'My Bids',
                        children: <OpenBids />,
                    },
                ]}
            />
        </Card>
    );
};