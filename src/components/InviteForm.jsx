import React from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from '../core/constants';
import {EventType, requestCreateEvent} from "@puzzlehq/sdk-core";
import {createTransaction} from "../core/transaction.js";

export const InviteForm = ({ visible, onCancel, ticketRecord }) => {
    const { publicKey, requestTransaction, wallet } = useWallet();
    const [form] = Form.useForm();

    const handleSubmit = async (values) => {
        try {
            const inputs = [ticketRecord, values.inviteeAddress];
            console.log("Inputs for Invite:", inputs);
            if (wallet?.adapter?.name === "Puzzle Wallet") {
                const params = {type: EventType.Execute, programId: PROGRAM_ID, functionId: 'invite_to_auction', fee: .07, inputs}
                await createTransaction(params, requestCreateEvent, wallet?.adapter?.name);
            } else {
                const params = {publicKey, functionName: 'invite_to_auction', inputs, fee: 70000, feePrivate: false};
                await createTransaction(params, requestTransaction, wallet?.adapter?.name);
            }
            onCancel();
        } catch (error) {
            console.error('Error sending invite:', error);
        }
    };

    return (
        <Modal
            title="Invite to Bid"
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
                    name="inviteeAddress"
                    label="Invitee Address"
                    rules={[
                        { required: true, message: 'Please enter the invitee address' },
                        { 
                            pattern: /^aleo1[a-z0-9]{58}$/i,
                            message: 'Please enter a valid Aleo address'
                        }
                    ]}
                >
                    <Input placeholder="Enter Aleo address to invite" />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block>
                        Send Invite
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
}; 