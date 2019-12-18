import {
    Address,
} from "@graphprotocol/graph-ts"

import {
    AuctionEnabled,
    BidPlaced,
    BidAccepted,
    BidRejected,
    BidWithdrawn,
    BidIncreased,
    AuctionCancelled,
} from "../../generated/ArtistAcceptingBidsV2/ArtistAcceptingBidsV2";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin"

import {AuctionEvent} from "../../generated/schema";

import {loadOrCreateEdition} from "../services/Edition.service";
import {recordArtistValue} from "../services/Artist.service";
import {recordDayBidAcceptedCount, recordDayValue} from "../services/Day.service";

import {toEther} from "../utils";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = true
    editionEntity.save()
}

// Bidding flow works like this:
// Edition is added to Action Contracts = AuctionEnabled
//
// Offers can be:
//
//  Rejected = BidRejected
//      - rejected by the artist
//      - monies returned to highest bidder, no open offers left
//
//  Withdrawn = BidWithdrawn
//      - bidder revokes offer (commonly if not accepted within a timeframe or social comms highlight not enough)
//      - monies returned to highest bidder
//
//  Increased = BidIncreased
//      - highest bidder increases their offer
//      - additional monies added
//
//  Accepted = BidAccepted
//      - Artist (or KO in very very small circumstances) accepts the current highest offer
//      - monies split between artist/KO & optional commission split
//      - no open offer remaining (new offers can now be made if not sold out)
//
// Cancelled = AuctionCancelled
//      - BR triggerred function
//      - refunds highest bidder

// Ideas on what to store:
// * auction history - single property pertaining to a running offer history against an edition
// * total accepted ETH against an Edition = capture ETH value for when bids are accepted
// * total rejected ETH against an Edition
// * total numbers of offers made

export function handleBidPlaced(event: BidPlaced): void {
    /*
      event BidPlaced(
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let timestamp = event.block.timestamp
    let bidder = event.params._bidder.toString();
    let editionNumber = event.params._editionNumber.toString()
    let auctionEventId = timestamp.toString().concat(bidder).concat(editionNumber)

    let auctionEvent = new AuctionEvent(auctionEventId);
    auctionEvent.name = 'BidPlaced'
    auctionEvent.bidder = event.params._bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(event.params._amount)

    auctionEvent.save()

    editionEntity.biddingHistory.push(auctionEvent.id)
    editionEntity.save()
}

export function handleBidAccepted(event: BidAccepted): void {
    /*
      event BidAccepted(
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 indexed _tokenId,
        uint256 _amount
      );
    */
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let artistAddress = contract.artistCommission(event.params._editionNumber).value0
    recordArtistValue(artistAddress, event.params._tokenId, event.transaction)

    // BidAccepted emit Transfer & Minted events
    // COUNTS HANDLED IN MINTED
    recordDayValue(event, event.params._tokenId)

    recordDayBidAcceptedCount(event, event.params._tokenId)
}

export function handleBidRejected(event: BidRejected): void {
    /*
      event BidRejected(
        address indexed _caller,
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidderRefunded(
        uint256 indexed _editionNumber,
        address indexed _bidder,
        uint256 _amount
      );
    */
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
}

export function handleBidIncreased(event: BidIncreased): void {
    /*
      event BidIncreased(
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    /*
      event AuctionCancelled(
        uint256 indexed _editionNumber
      );
    */
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
}
