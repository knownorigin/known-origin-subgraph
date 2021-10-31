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

import {MAX_UINT_256, ONE} from "../utils/constants";

import {toEther} from "../utils/utils";
import {getArtistAddress} from "../services/AddressMapping.service";
import {getKnownOriginV2ForAddress} from "../utils/KODAV2AddressLookup";

import * as EVENT_TYPES from "../utils/EventTypes";
import * as SaleTypes from "../utils/SaleTypes";

import * as editionService from "../services/Edition.service";
import * as artistService from "../services/Artist.service";
import * as dayService from "../services/Day.service";
import * as auctionEventFactory from "../services/AuctionEvent.factory";
import * as auctionEventService from "../services/AuctionEvent.service";
import * as collectorService from "../services/Collector.service";
import * as offerService from "../services/Offers.service";
import * as tokenService from "../services/Token.service";
import * as activityEventService from "../services/ActivityEvent.service";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    let contract = getKnownOriginV2ForAddress(event.address)

    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = true

    const priceInWei = contract.priceInWeiEdition(event.params._editionNumber)
    if (priceInWei.equals(MAX_UINT_256)) {
        editionEntity.offersOnly = true;
        editionEntity.salesType = SaleTypes.OFFERS_ONLY
    } else {
        editionEntity.offersOnly = false;
        editionEntity.salesType = SaleTypes.BUY_NOW_AND_OFFERS
    }
    editionEntity.metadataPrice = priceInWei

    editionEntity.save()
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    /*
      event AuctionCancelled(
        uint256 indexed _editionNumber
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = false
    editionEntity.offersOnly = false
    editionEntity.salesType = SaleTypes.BUY_NOW
    editionEntity.save()

    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)

    offerService.clearEditionOffer(event.block, event.params._editionNumber)
}

export function handleBidPlaced(event: BidPlaced): void {
    /*
      event BidPlaced(
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = auctionEventFactory.createBidPlacedEvent(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidPlacedCount(event)

    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)
    dayService.recordDayTotalValuePlaceInBids(event, event.params._amount)

    auctionEventService.recordActiveEditionBid(event.params._editionNumber, auctionEvent)

    offerService.recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, null, event.params._editionNumber)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)
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

    let contract = getKnownOriginV2ForAddress(event.address)
    let artistAddress = getArtistAddress(contract.artistCommission(event.params._editionNumber).value0)

    let collector = collectorService.loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

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

    // Tally up primary sale owners
    if (!collectorService.collectorInList(collector, editionEntity.primaryOwners)) {
        let primaryOwners = editionEntity.primaryOwners;
        primaryOwners.push(collector.id);
        editionEntity.primaryOwners = primaryOwners;
    }

    editionEntity.save();

    // BidAccepted emit Transfer & Minted events
    // COUNTS HANDLED IN MINTED
    dayService.recordDayValue(event, event.params._tokenId, event.params._amount)
    artistService.recordArtistValue(artistAddress, event.params._tokenId, event.params._amount)

    dayService.recordDayCounts(event, event.params._amount)
    artistService.recordArtistCounts(artistAddress, event.params._amount)

    dayService.recordDayBidAcceptedCount(event)

    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)

    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)
    offerService.clearEditionOffer(event.block, event.params._editionNumber)

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

export function handleBidRejected(event: BidRejected): void {
    /*
      event BidRejected(
        address indexed _caller,
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = auctionEventFactory.createBidRejected(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidRejectedCount(event)

    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)

    auctionEventService.removeActiveBidOnEdition(event.params._editionNumber)
    offerService.clearEditionOffer(event.block, event.params._editionNumber)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_REJECTED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidWithdrawn(
        address indexed _bidder,
        uint256 indexed _editionNumber
      );
    */
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
    offerService.clearEditionOffer(event.block, event.params._editionNumber)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
}

export function handleBidIncreased(event: BidIncreased): void {
    /*
      event BidIncreased(
        address indexed _bidder,
        uint256 indexed _editionNumber,
        uint256 _amount
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = auctionEventFactory.createBidIncreased(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidIncreasedCount(event)
    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)
    dayService.recordDayTotalValuePlaceInBids(event, event.params._amount)

    auctionEventService.recordActiveEditionBid(event.params._editionNumber, auctionEvent)
    offerService.recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, null, event.params._editionNumber)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_INCREASED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidderRefunded(event: BidderRefunded): void {
    // We know if monies are being sent back then there cannot be an open bid on the edition
    // TODO disabled for now, this event is sent on almost all others so dont want to double process in some form
    // auctionEventFactory.removeActiveBidOnEdition(event.params._editionNumber)
}
