import React from "react";
import { Link } from "react-router-dom";

import "./Homepage.css";

const Homepage = () => {
    return (
        <div className="homepage">
            <Link to="https://provable.com/">
                <img
                    src="../public/provable-logo-light.svg"
                    className="logo"
                ></img>
            </Link>
            <div className="headerContainer">
                <h1 className="header">Zero Knowledge Auctions</h1>
                <p className="subheader">
                    Learn how to manage private state via private auctions.
                </p>{" "}
                <div className="buttonRow">
                <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to="/bidder"
                >
                    <button className="button">
                        {" "}
                        MarketPlace <span className="arrow">&rarr;</span>{" "}
                    </button>
                </Link>{" "}
                <Link
                    target="_blank"
                    rel="noopener noreferrer"
                    to="/auctioneer"
                >
                    <button className="button">
                        {" "}
                        Create an Auction <span className="arrow">&rarr;</span>{" "}
                    </button>
                </Link>{" "}
                </div>
                <div className="footer">
                    <a href="https://github.com/ProvableHQ/sdk">
                        <img
                            src="../public/github-mark-white.png"
                            style={{ height: "24px", marginBottom: "1rem" }}
                        ></img>
                    </a>
                    © 2025 Provable Inc.
                </div>
            </div>
        </div>
    );
};

export default Homepage;
