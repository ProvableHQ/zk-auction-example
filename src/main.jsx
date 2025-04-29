import "./App.css";
import React, { useEffect, useState } from "react";
import { App, ConfigProvider, Layout, Menu, Switch, theme } from "antd";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuctionState } from "./components/AuctionState.jsx";
import { WalletWrapper } from "./components/WalletWrapper.jsx";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";

import {
    AuditOutlined,
    OrderedListOutlined,
    SwapOutlined,
} from "@ant-design/icons";
import { WasmLoadingMessage } from "./components/WasmLoadingMessage.jsx";
import {WalletMultiButton} from "@demox-labs/aleo-wallet-adapter-reactui";

const { Content, Footer, Sider } = Layout;

const menuItems = [
    {
        label: <Link to="/auctioneer">Create Auction</Link>,
        key: "auctioneer",
        icon: <AuditOutlined />,
    },
    {
        label: <Link to="/marketplace">Marketplace</Link>,
        key: "marketplace",
        icon: <SwapOutlined />,
    },
    {
        label: <Link to="/bids">My Bids</Link>,
        key: "bids",
        icon: <OrderedListOutlined />,
    },
];
function Main() {
    const [menuIndex, setMenuIndex] = useState("/auctioneer");
    const { connected } = useWallet();

    const navigate = useNavigate();
    const location = useLocation();
    const onClick = (e) => {
        navigate(e.key);
    };

    useEffect(() => {
        setMenuIndex(location.pathname);
    }, [location, navigate]);

    const [darkMode, setDarkMode] = useState(true);

    return (
        <WalletWrapper>
            <AuctionState>
                <ConfigProvider
                    theme={{
                        algorithm: darkMode
                            ? theme.darkAlgorithm
                            : theme.defaultAlgorithm,
                        token: {
                            colorPrimary: "#18e48f",
                        },
                    }}
                >
                <App>
                    <Layout style={{ minHeight: "100vh" }}>
                        <Sider breakpoint="lg" collapsedWidth="0" theme="light">
                            <h1 className={darkMode ? "headerDark": "headerLight"}>
                                <Link to="/">
                                ZkAuction
                                </Link>
                            </h1>
                            <Menu
                                theme="light"
                                mode="inline"
                                selectedKeys={[menuIndex]}
                                items={menuItems}
                                onClick={onClick}
                            />
                            <Switch
                                style={{
                                    marginTop: "24px",
                                    marginLeft: "24px",
                                }}
                                checked={darkMode}
                                onChange={(value) => setDarkMode(value)}
                                checkedChildren="Dark"
                                unCheckedChildren="Light"
                            />
                            <div style={{ margin: "20px" }}>
                                <WalletMultiButton />
                            </div>
                        </Sider>
                        <Layout>
                            <Content style={{ padding: "50px 50px", margin: "0 auto", minWidth: "850px" }}>
                                <Outlet />
                            </Content>
                            <Footer style={{ textAlign: "center", display:"flex", flexDirection: "column" }}>

                                <a href="https://github.com/ProvableHQ/sdk">
                                <img src="../public/github-mark-white.png" style={{height:"24px"}}></img>
                                </a>
                                <Link to="https://sdk.betteruptime.com/" style={{color: "white"}}> <span>Status</span> </Link>
                                <Link to="/terms_of_use" style={{color: "white"}}> <span>Terms of Use</span> </Link>
                                <Link to="/privacy_policy" style={{color:"white"}}><span>Privacy Policy</span></Link>
                                © 2025 Provable Inc.
                            </Footer>
                        </Layout>
                    </Layout>
                </App>
                </ConfigProvider>
            </AuctionState>
        </WalletWrapper>
    );
}

export default Main;
