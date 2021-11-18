import {
    AuctionCancelled,
    BidAccepted,
    BidderRefunded,
    BidIncreased,
    BidPlaced,
    BidWithdrawn
} from "../../generated/ArtistAcceptingBidsV1/ArtistAcceptingBidsV1";

import {ONE, ZERO} from "../utils/constants";
import {toEther} from "../utils/utils";
import {getArtistAddress} from "../services/AddressMapping.service";
import {getKnownOriginV2ForAddress} from "../utils/KODAV2AddressLookup";
import * as EVENT_TYPES from "../utils/EventTypes";

import * as artistService from "../services/Artist.service";
import * as editionService from "../services/Edition.service";
import * as dayService from "../services/Day.service";
import * as auctionEventFactory from "../services/AuctionEvent.factory";
import * as collectorService from "../services/Collector.service";
import * as tokenService from "../services/Token.service";
import * as activityEventService from "../services/ActivityEvent.service";
import * as auctionEventService from "../services/AuctionEvent.service";
import {handleKodaV2CommissionSplit} from "../services/Artist.service";

export function handleBidPlaced(event: BidPlaced): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = auctionEventFactory.createBidPlacedEvent(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidPlacedCount(event)

    auctionEventService.recordActiveEditionBid(event.params._editionNumber, auctionEvent)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidAccepted(event: BidAccepted): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let artistAddress = getArtistAddress(contract.artistCommission(event.params._editionNumber).value0)

    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition.plus(toEther(event.params._amount));

    let auctionEvent = auctionEventFactory.createBidAccepted(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
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
    dayService.recordDayValue(event, event.params._tokenId, event.params._amount)
    artistService.handleKodaV2CommissionSplit(contract, event.params._editionNumber, event.params._tokenId, event.params._amount)

    dayService.recordDayCounts(event, event.params._amount)

    dayService.recordDayBidAcceptedCount(event)

    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)

    collectorService.addPrimarySaleToCollector(event.block, event.params._bidder, event.params._amount);

    // Set price against token
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.primaryValueInEth = toEther(event.params._amount)
    tokenEntity.lastSalePriceInEth = toEther(event.params._amount)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(event.params._amount))
    tokenEntity.save()

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_ACCEPTED, editionEntity, tokenEntity, event.params._amount, event.params._bidder)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._amount, event.params._bidder)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = auctionEventFactory.createBidWithdrawn(event.block, event.transaction, editionEntity, event.params._bidder);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidWithdrawnCount(event)

    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
}

export function handleBidIncreased(event: BidIncreased): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = auctionEventFactory.createBidIncreased(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidIncreasedCount(event)

    auctionEventService.recordActiveEditionBid(event.params._editionNumber, auctionEvent)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_INCREASED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidderRefunded(event: BidderRefunded): void {
    // We know if monies are being sent back then there cannot be an open bid on the edition
    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = false
    editionEntity.save()

    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)
}
