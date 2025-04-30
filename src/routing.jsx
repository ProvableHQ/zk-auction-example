import React from "react";
import { createBrowserRouter } from "react-router-dom";
import Main from "./main.jsx";
import { CreateAuction } from "./tabs/auctioneer/CreateAuction";
import { OpenAuctions } from "./tabs/auctioneer/OpenAuctions";
import { OpenBids } from "./tabs/bids/OpenBids.jsx";
import { BidFeed} from "./tabs/marketplace/BidFeed.jsx";
import Homepage from "./pages/Homepage";
import { AuctionExplorer } from './tabs/marketplace/AuctionExplorer';

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Homepage />,
    },
    {
        element: <Main />,
        children: [
            {
                path: "/auctioneer",
                element: (
                    <>
                        <CreateAuction />
                        <br />
                        <OpenAuctions />
                    </>
                ),
            },
            {
                path: "/bids",
                element: (
                    <>
                        <OpenBids />
                    </>
                ),
            },
            {
                path: "/marketplace",
                element: (
                    <>
                        <BidFeed/>
                        <br/>
                        <AuctionExplorer/>
                    </>
                ),
            },
        ],
    },
    {
        path: '/explore',
        element: <AuctionExplorer />
    },
]);
