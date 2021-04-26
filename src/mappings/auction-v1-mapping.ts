import {
    BidPlaced,
    BidAccepted,
    BidWithdrawn,
    BidIncreased,
    AuctionCancelled,
    BidderRefunded
} from "../../generated/ArtistAcceptingBidsV1/ArtistAcceptingBidsV1";

import {loadOrCreateV2Edition} from "../services/Edition.service";
import {recordArtistCounts, recordArtistValue} from "../services/Artist.service";

import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidWithdrawnCount,
    recordDayBidIncreasedCount,
    recordDayValue,
    recordDayCounts
} from "../services/Day.service";

import {ONE} from "../constants";
import {recordActiveEditionBid, removeActiveBidOnEdition} from "../services/AuctionEvent.service";
import {
    createBidAccepted,
    createBidIncreased,
    createBidPlacedEvent,
    createBidWithdrawn
} from "../services/AuctionEvent.factory";
import {toEther} from "../utils";
import {getArtistAddress} from "../services/AddressMapping.service";

import {
    addPrimarySaleToCollector
} from "../services/Collector.service";
import {getKnownOriginV2ForAddress} from "../services/KnownOrigin.factory";
import {loadOrCreateV2Token} from "../services/Token.service";
import {recordPrimarySaleEvent} from "../services/ActivityEvent.service";
import * as EVENT_TYPES from "../services/EventTypes";

export function handleBidPlaced(event: BidPlaced): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidPlacedEvent(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidPlacedCount(event)

    recordActiveEditionBid(event.params._editionNumber, auctionEvent)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidAccepted(event: BidAccepted): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let artistAddress = getArtistAddress(contract.artistCommission(event.params._editionNumber).value0)

    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition.plus(toEther(event.params._amount));

    let auctionEvent = createBidAccepted(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    // Record sale against the edition
    let sales = editionEntity.sales
    sales.push(event.params._tokenId.toString())
    editionEntity.sales = sales
    editionEntity.totalSold = editionEntity.totalSold.plus(ONE)

    // Maintain bidding history list
    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    // BidAccepted emit Transfer & Minted events
    // COUNTS HANDLED IN MINTED
    recordDayValue(event, event.params._tokenId, event.params._amount)
    recordArtistValue(artistAddress, event.params._tokenId, event.params._amount)

    recordDayCounts(event, event.params._amount)
    recordArtistCounts(artistAddress, event.params._amount)

    recordDayBidAcceptedCount(event)

    removeActiveBidOnEdition(event.params._editionNumber)

    addPrimarySaleToCollector(event.block, event.params._bidder, event.params._amount);

    // Set price against token
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.primaryValueInEth = toEther(event.params._amount)
    tokenEntity.lastSalePriceInEth = toEther(event.params._amount)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(event.params._amount))
    tokenEntity.save()

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_ACCEPTED, editionEntity, tokenEntity, event.params._amount, event.params._bidder)

    recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._amount, event.params._bidder)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidWithdrawn(event.block, event.transaction, editionEntity, event.params._bidder);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidWithdrawnCount(event)

    removeActiveBidOnEdition(event.params._editionNumber)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
}

export function handleBidIncreased(event: BidIncreased): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidIncreased(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidIncreasedCount(event)

    recordActiveEditionBid(event.params._editionNumber, auctionEvent)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_INCREASED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidderRefunded(event: BidderRefunded): void {
    // We know if monies are being sent back then there cannot be an open bid on the edition
    removeActiveBidOnEdition(event.params._editionNumber)
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = false
    editionEntity.save()

    removeActiveBidOnEdition(event.params._editionNumber)
}
