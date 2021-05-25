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

import {loadOrCreateV2Edition} from "../services/Edition.service";
import {recordArtistCounts, recordArtistValue} from "../services/Artist.service";

import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidRejectedCount,
    recordDayBidWithdrawnCount,
    recordDayBidIncreasedCount,
    recordDayValue,
    recordDayTotalValueCycledInBids,
    recordDayTotalValuePlaceInBids,
    recordDayCounts
} from "../services/Day.service";

import {MAX_UINT_256, ONE} from "../utils/constants";
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

import {toEther} from "../utils/utils";
import {addPrimarySaleToCollector, collectorInList, loadOrCreateCollector} from "../services/Collector.service";
import {getArtistAddress} from "../services/AddressMapping.service";
import {getKnownOriginV2ForAddress} from "../utils/KODAV2AddressLookup";
import {clearEditionOffer, recordEditionOffer} from "../services/Offers.service";
import {loadOrCreateV2Token} from "../services/Token.service";

import {recordPrimarySaleEvent} from "../services/ActivityEvent.service";
import * as EVENT_TYPES from "../utils/EventTypes";
import * as SaleTypes from "../utils/SaleTypes";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    let contract = getKnownOriginV2ForAddress(event.address)

    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = true

    const priceInWei = contract.priceInWeiEdition(event.params._editionNumber)
    if (priceInWei.equals(MAX_UINT_256)) {
        editionEntity.offersOnly = true;
        editionEntity.salesType = SaleTypes.OFFERS_ONLY
    } else {
        editionEntity.offersOnly = false;
        editionEntity.salesType = SaleTypes.BUY_NOW_AND_OFFERS
    }

    editionEntity.save()
}

export function handleAuctionCancelled(event: AuctionCancelled): void {
    /*
      event AuctionCancelled(
        uint256 indexed _editionNumber
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.auctionEnabled = false
    editionEntity.offersOnly = false
    editionEntity.salesType = SaleTypes.BUY_NOW
    editionEntity.save()

    removeActiveBidOnEdition(event.params._editionNumber)

    clearEditionOffer(event.block, event.params._editionNumber)
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
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidPlacedEvent(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidPlacedCount(event)

    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    recordActiveEditionBid(event.params._editionNumber, auctionEvent)

    recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._editionNumber)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)
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

    let collector = loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

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

    // Tally up primary sale owners
    if (!collectorInList(collector, editionEntity.primaryOwners)) {
        let primaryOwners = editionEntity.primaryOwners;
        primaryOwners.push(collector.id);
        editionEntity.primaryOwners = primaryOwners;
    }

    editionEntity.save();

    // BidAccepted emit Transfer & Minted events
    // COUNTS HANDLED IN MINTED
    recordDayValue(event, event.params._tokenId, event.params._amount)
    recordArtistValue(artistAddress, event.params._tokenId, event.params._amount)

    recordDayCounts(event, event.params._amount)
    recordArtistCounts(artistAddress, event.params._amount)

    recordDayBidAcceptedCount(event)

    recordDayTotalValueCycledInBids(event, event.params._amount)

    removeActiveBidOnEdition(event.params._editionNumber)
    clearEditionOffer(event.block, event.params._editionNumber)

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
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidRejected(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidRejectedCount(event)

    recordDayTotalValueCycledInBids(event, event.params._amount)

    removeActiveBidOnEdition(event.params._editionNumber)
    clearEditionOffer(event.block, event.params._editionNumber)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_REJECTED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidWithdrawn(
        address indexed _bidder,
        uint256 indexed _editionNumber
      );
    */
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
    clearEditionOffer(event.block, event.params._editionNumber)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
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
    let editionEntity = loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let auctionEvent = createBidIncreased(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidIncreasedCount(event)
    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    recordActiveEditionBid(event.params._editionNumber, auctionEvent)
    recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._editionNumber)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_INCREASED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleBidderRefunded(event: BidderRefunded): void {
    // We know if monies are being sent back then there cannot be an open bid on the edition
    // TODO disabled for now, this event is sent on almost all others so dont want to double process in some form
    // removeActiveBidOnEdition(event.params._editionNumber)
}
