import { createBrowserRouter } from "react-router-dom";
import Main from "./main.jsx";
import { CreateAuction } from "./tabs/auctioneer/CreateAuction";
import { OpenAuctions } from "./tabs/auctioneer/OpenAuctions";
import { MyBids } from "./tabs/bidder/MyBids.jsx";
import { BidFeed} from "./tabs/bidder/BidFeed.jsx";
import Homepage from "./pages/Homepage";
import { AuctionExplorer } from './tabs/bidder/AuctionExplorer';

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
                path: "/marketplace",
                element: (
                    <>
                        <BidFeed/>
                        <br/>
                        <AuctionExplorer/>
                    </>
                ),
            },
            {
                path: "/bids",
                element: (
                    <>
                        <MyBids />
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
