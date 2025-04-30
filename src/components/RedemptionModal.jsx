import React from 'react';
import { Modal, Button, Space, Typography } from 'antd';

const { Text } = Typography;

export const RedemptionModal = ({ 
    visible, 
    onCancel, 
    onRedeem, 
    selectedBid,
    isPublicAuction,
    hasInvite
}) => {
    if (!selectedBid) return null;

    return (
        <Modal
            title="Select Redemption Method"
            visible={visible}
            onCancel={onCancel}
            footer={null}
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Please select a redemption method for your winning bid:</Text>
                
                {isPublicAuction && (
                    <>
                        <Button 
                            type="primary" 
                            block 
                            onClick={() => onRedeem('public')}
                        >
                            Redeem Publicly
                        </Button>
                        
                        <Button 
                            block 
                            onClick={() => onRedeem('private_to_public')}
                        >
                            Redeem Privately (Transfer to Public Address)
                        </Button>
                    </>
                )}
                
                {hasInvite && (
                    <Button 
                        block 
                        onClick={() => onRedeem('private')}
                    >
                        Redeem Privately
                    </Button>
                )}
                
                {!isPublicAuction && !hasInvite && (
                    <Text type="danger">
                        No valid redemption methods available for this bid.
                    </Text>
                )}
            </Space>
        </Modal>
    );
}; 