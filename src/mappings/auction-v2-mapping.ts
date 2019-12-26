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
    BidderRefunded,
    AuctionCancelled,
} from "../../generated/ArtistAcceptingBidsV2/ArtistAcceptingBidsV2";

import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin"

import {AuctionEvent} from "../../generated/schema";

import {loadOrCreateEdition} from "../services/Edition.service";
import {recordArtistValue} from "../services/Artist.service";

import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidRejectedCount,
    recordDayBidWithdrawnCount,
    recordDayBidIncreasedCount,
    recordDayValue
} from "../services/Day.service";

import {toEther} from "../utils";

import {KODA_MAINNET} from "../constants";
import {
    createBidPlacedEvent,
    createBidAccepted,
    createBidRejected,
    createBidWithdrawn,
    createBidIncreased
} from "../services/AuctionEvent.factory";

import {
    recordActiveEditionBid,
    removeActiveBidOnEdition
} from "../services/AuctionEvent.service";


export function handleAuctionEnabled(event: AuctionEnabled): void {
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))

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
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidPlacedEvent(event.block, event.transaction, event.params._editionNumber, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidPlacedCount(event)

    recordActiveEditionBid(event.params._editionNumber, auctionEvent)
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
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let artistAddress = contract.artistCommission(event.params._editionNumber).value0
    recordArtistValue(artistAddress, event.params._tokenId, event.transaction)

    let auctionEvent = createBidAccepted(event.block, event.transaction, event.params._editionNumber, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    // BidAccepted emit Transfer & Minted events
    // COUNTS HANDLED IN MINTED
    recordDayValue(event, event.params._tokenId, event.params._amount)

    recordDayBidAcceptedCount(event)

    removeActiveBidOnEdition(event.params._editionNumber)
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
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidRejected(event.block, event.transaction, event.params._editionNumber, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidRejectedCount(event)

    removeActiveBidOnEdition(event.params._editionNumber)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidWithdrawn(
        address indexed _bidder,
        uint256 indexed _editionNumber
      );
    */
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidWithdrawn(event.block, event.transaction, event.params._editionNumber, event.params._bidder);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidWithdrawnCount(event)

    removeActiveBidOnEdition(event.params._editionNumber)
}

export function handleBidIncreased(event: BidIncreased): void {
    /*
      event BidIncreased(
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidIncreased(event.block, event.transaction, event.params._editionNumber, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidIncreasedCount(event)

    recordActiveEditionBid(event.params._editionNumber, auctionEvent)
}

export function handleBidderRefunded(event: BidderRefunded): void {
    // We know if monies are being sent back then there cannot be an open bid on the edition
    removeActiveBidOnEdition(event.params._editionNumber)
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    /*
      event AuctionCancelled(
        uint256 indexed _editionNumber
      );
    */
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = false
    editionEntity.save()

    removeActiveBidOnEdition(event.params._editionNumber)
}
