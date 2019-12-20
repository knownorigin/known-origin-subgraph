import {
    Address,
    BigDecimal
} from "@graphprotocol/graph-ts"

import {
    BidPlaced,
    BidAccepted,
    BidWithdrawn,
    BidIncreased,
} from "../../generated/ArtistAcceptingBidsV1/ArtistAcceptingBidsV1";

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

export function handleBidPlaced(event: BidPlaced): void {
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let timestamp = event.block.timestamp
    let bidder = event.params._bidder.toHexString();
    let editionNumber = event.params._editionNumber.toString()
    let auctionEventId = timestamp.toString().concat(bidder).concat(editionNumber)
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidPlaced'
    auctionEvent.bidder = event.params._bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(event.params._amount)
    auctionEvent.caller = event.transaction.from

    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidPlacedCount(event)
}

export function handleBidAccepted(event: BidAccepted): void {
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let artistAddress = contract.artistCommission(event.params._editionNumber).value0
    recordArtistValue(artistAddress, event.params._tokenId, event.transaction)

    let timestamp = event.block.timestamp
    let bidder = event.params._bidder.toHexString();
    let editionNumber = event.params._editionNumber.toString()
    let auctionEventId = timestamp.toString().concat(bidder).concat(editionNumber)
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidAccepted'
    auctionEvent.bidder = event.params._bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(event.params._amount)
    auctionEvent.caller = event.transaction.from

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
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let timestamp = event.block.timestamp
    let bidder = event.params._bidder.toHexString();
    let editionNumber = event.params._editionNumber.toString()
    let auctionEventId = timestamp.toString().concat(bidder).concat(editionNumber)
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidWithdrawn'
    auctionEvent.bidder = event.params._bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = BigDecimal.fromString('0.0')
    auctionEvent.caller = event.transaction.from

    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidWithdrawnCount(event)
}

export function handleBidIncreased(event: BidIncreased): void {
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let timestamp = event.block.timestamp
    let bidder = event.params._bidder.toHexString();
    let editionNumber = event.params._editionNumber.toString()
    let auctionEventId = timestamp.toString().concat(bidder).concat(editionNumber)
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidIncreased'
    auctionEvent.bidder = event.params._bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(event.params._amount)
    auctionEvent.caller = event.transaction.from

    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidIncreasedCount(event)
}
