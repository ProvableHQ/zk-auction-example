import React from 'react';
import { Tabs, Card } from 'antd';
import { PublicAuctions } from './components/PublicAuctions';
import { InvitedAuctions } from './components/InvitedAuctions';

export const AuctionExplorer = () => {
    return (
        <Card style={{ width: '100%', minHeight: '200px', }}>
            <Tabs size="large"
                defaultActiveKey="1"
                items={[
                    {
                        key: '1',
                        label: 'Public Auctions',
                        children: <PublicAuctions />,
                    },
                    {
                        key: '2',
                        label: 'Private Auctions (Invite-Only)',
                        children: <InvitedAuctions />,
                    },
                ]}
            />
        </Card>
    );
}; 