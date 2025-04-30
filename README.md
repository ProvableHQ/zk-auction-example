# Private Auctions with Aleo

## Overview
**zkAuction** is an example private auction system built on Aleo which can be used for applications like sealed-bid auctions, 
private NFT sales, or competitive procurement. It demonstrates how to mix private and public state within an Aleo smart
contract and use that state within an end user application.

## Quickstart

### Develop in the Browser
Immediately begin developing this project in the browser using StackBlitz or Deploy it with Vercel.

<div >

  <a href="https://stackblitz.com/github/ProvableHQ/zk-auction-example">
    <img src="https://img.shields.io/badge/StackBlitz-Edit-blue?style=for-the-badge&logo=stackblitz&logoColor=white" height="40" alt="Edit on StackBlitz" />
  </a>
  &nbsp;&nbsp;
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/ProvableHQ/zk-auction-example">
    <img src="https://img.shields.io/badge/Vercel-Deploy-black?style=for-the-badge&logo=vercel&logoColor=white" height="40" alt="Deploy with Vercel" />
  </a>
</div>

### Deploy Your Own Smart Contract

Examine and Extend Aleo smart contract behind this project to create your own auction system on the Leo Playground.

<div >
  <a href="https://play.leo-lang.org/?gistId=b3a70c097441317595e2464a6b14a580&revision=591aed124633cfa967efb6abec4894484167c456">
    <img src="https://img.shields.io/badge/🦁-Leo Playground-orange?style=for-the-badge&logo=aleo&logoColor=white&labelColor=gray" height="40" alt="Explore on Leo Playground" />
  </a>
</div>

### Develop Locally

Run this project locally with the following commands.

```bash
yarn install && yarn dev
```

## Features

### 👤 Auctioneering Features
* Create a fully private auction, a public auction that hides the auctioneer, or fully public auction.
* Have any auction accept only private bids, only public bids, or a mix of both.
* Invite specific participants to bid privately via encrypted, on-chain invites.

### 🙋 Bidding Features
* Place public bids, which are visible on-chain — while optionally keeping their identity hidden.
* Place private bids, which are encrypted and only visible to the auctioneer.
* Prove ownership of bids using bid receipts, allowing them to later redeem their bid if it wins — either privately or publicly.
* Redeem items privately or publicly.
* Pay the bid price publicly or privately.

