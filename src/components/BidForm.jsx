import React from 'react';
import { Modal, Form, InputNumber, Button, Checkbox } from 'antd';
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import {EventType, requestCreateEvent} from "@puzzlehq/sdk-core";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from '../core/constants';
import { Scalar } from '@provablehq/sdk';
import {createTransaction} from "../core/transaction.js";

export const BidForm = ({ visible, onCancel, auctionData, bidType }) => {
    const [ showAddress, setShowAddress ] = React.useState(false);
    const { publicKey, requestTransaction, wallet } = useWallet();
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        try {
            // Generate input parameters.
            const functionName = bidType === 'private' ? 'bid_private' : 'bid_public';
            const nonce = Scalar.random().toString();
            let inputs = [];

            if (bidType === 'private') {
                inputs = [
                    values.amount.toString() + "u64",
                    auctionData.auctionId ? auctionData.auctionId : auctionData.id,
                    auctionData.auctioneer,
                    "2group",
                    nonce,
                ];
            } else {
                inputs = [
                    values.amount.toString() + "u64",
                    uctionData.auctionId ? auctionData.auctionId : auctionData.id,
                    nonce,
                    values.publishAddress?.toString() || "false", // Optional: show bidder address
                ];
            }

            if (wallet?.adapter?.name === "Puzzle Wallet") {
                const params = {type: EventType.Execute, programId: PROGRAM_ID, functionId: functionName, fee: 0.09, inputs}
                await createTransaction(params, requestCreateEvent, wallet?.adapter?.name);
            } else {
                const params = {publicKey, functionName, inputs, fee: 90000, feePrivate: false};
                await createTransaction(params, requestTransaction, wallet?.adapter?.name);
            }

            form.resetFields();
            onCancel();
        } catch (error) {
            console.error('Error submitting bid:', error);
        }
    };

    return (
        <Modal
            title={`Place ${bidType === 'private' ? 'Private' : 'Public'} Bid`}
            open={visible}
            onCancel={onCancel}
            footer={null}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
            >
                <Form.Item
                    name="amount"
                    label="Bid Amount"
                    rules={[
                        { required: true, message: 'Please enter bid amount' },
                        { type: 'number', min: auctionData.starting_bid, message: `Minimum bid is ${auctionData.starting_bid}` }
                    ]}
                >
                    <InputNumber
                        style={{ width: '100%' }}
                        placeholder="Enter bid amount in microcredits"
                    />
                </Form.Item>

                {bidType === 'public' && (
                    <Form.Item
                        name="publishAddress"
                        valuePropName="checked"
                    >
                        <Checkbox checked={showAddress} >
                            Show my address publicly
                        </Checkbox>
                    </Form.Item>
                )}

                <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                        Submit Bid
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}; 