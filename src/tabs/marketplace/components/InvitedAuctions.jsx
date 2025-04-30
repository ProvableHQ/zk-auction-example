import React, { useState, useEffect } from 'react';
import { Card, List, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { PROGRAM_ID } from '../../../core/constants';
import { AuctionCard } from '../../../components/AuctionCard';
import { filterVisibility } from '../../../core/processing';
import {useAuctionState} from "../../../components/AuctionState.jsx";
import {WalletMultiButton} from "@demox-labs/aleo-wallet-adapter-reactui";

import { Typography } from 'antd';
const { Text } = Typography;

export const InvitedAuctions = () => {
    const { connected, publicKey } = useWallet();
    const { auctionState, updatePrivateAuctionState } = useAuctionState();
    const [loading, setLoading] = useState(false);
    const [auctionData, setAuctionData] = useState([]);

    // Find the latest invited bids and set them.
    const processAuctionData = () => {
        setLoading(true);
        try {
            const inviteIds = new Set(auctionState.bidInvites.filter(invite => filterVisibility(invite.data.auction_id)));
            const invitedAuctions = Object.entries(auctionState.auctions || {})
                .filter(([_, auction]) => inviteIds.has(auction.id))
            setAuctionData(invitedAuctions);
        } catch (error) {
            console.error('Error processing auction data:', error);
        }
        setLoading(false);
    };

    // Update the auction state when the component mounts or when the wallet connection changes.
    const refreshData = async () => {
        setLoading(true);
        try {
            if (connected) {
                await updatePrivateAuctionState();
            }
            // Process the updated state
            processAuctionData();
        } catch (error) {
            console.error('Error refreshing auction data:', error);
        }
        setLoading(false);
    };

    return (
        <Card
            title="Auctions You've Been Invited To"
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
            style={{ width: '100%' }}
        >
            {!connected ? (
                <>
                    <WalletMultiButton />
                    <Text>Please connect your wallet to view your auctions</Text>
                </>
            ) : (
                <List
                    dataSource={Object.entries(auctionData)}
                    renderItem={([auctionId, data]) => (
                        <AuctionCard auctionId={auctionId} data={data} loading={loading} />
                    )}
                    locale={{ emptyText: 'Once someone invites you to an auction, auction information will appear here' }}
                />
            )}
        </Card>
    );
}; 