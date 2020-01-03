import {
    Address,
} from "@graphprotocol/graph-ts"

import {
    BidPlaced,
    BidAccepted,
    BidWithdrawn,
    BidIncreased,
    AuctionCancelled,
    BidderRefunded
} from "../../generated/ArtistAcceptingBidsV1/ArtistAcceptingBidsV1";

import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin"

import {loadOrCreateEdition} from "../services/Edition.service";
import {recordArtistCounts, recordArtistValue} from "../services/Artist.service";

import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidWithdrawnCount,
    recordDayBidIncreasedCount,
    recordDayValue, recordDayCounts
} from "../services/Day.service";

import {KODA_MAINNET} from "../constants";
import {recordActiveEditionBid, removeActiveBidOnEdition} from "../services/AuctionEvent.service";
import {
    createBidAccepted,
    createBidIncreased,
    createBidPlacedEvent,
    createBidWithdrawn
} from "../services/AuctionEvent.factory";

export function handleBidPlaced(event: BidPlaced): void {
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
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let artistAddress = contract.artistCommission(event.params._editionNumber).value0
    recordArtistValue(artistAddress, event.params._tokenId, event.params._amount)

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

    // FIXME
    recordDayCounts(event, event.params._tokenId, event.params._amount)
    recordArtistCounts(artistAddress, event.params._amount)

    recordDayBidAcceptedCount(event)

    removeActiveBidOnEdition(event.params._editionNumber)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
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
    let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = false
    editionEntity.save()

    removeActiveBidOnEdition(event.params._editionNumber)
}
