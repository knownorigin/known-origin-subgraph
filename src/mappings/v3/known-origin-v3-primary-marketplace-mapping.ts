import {ONE, ZERO, ZERO_ADDRESS} from "../../utils/constants";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";
import {Address, Bytes, ethereum, log} from "@graphprotocol/graph-ts/index";
import {BigInt} from "@graphprotocol/graph-ts";

import {Collector, Edition, Token} from "../../../generated/schema";

import {
    AdminUpdateMinBidAmount,
    AdminUpdateModulo,
    AdminUpdatePlatformPrimarySaleCommission,
    BidPlacedOnReserveAuction,
    BidWithdrawnFromReserveAuction,
    BuyNowPriceChanged,
    BuyNowPurchased,
    ConvertFromBuyNowToOffers,
    ConvertSteppedAuctionToBuyNow,
    EditionAcceptingOffer,
    EditionBidAccepted,
    EditionBidPlaced,
    EditionBidRejected,
    EditionBidWithdrawn,
    EditionConvertedFromOffersToBuyItNow,
    EditionSteppedAuctionUpdated,
    EditionSteppedSaleBuy,
    EditionSteppedSaleListed,
    EmergencyBidWithdrawFromReserveAuction,
    KODAV3PrimaryMarketplace,
    ListedForBuyNow,
    ListedForReserveAuction,
    ReserveAuctionConvertedToBuyItNow,
    ReserveAuctionConvertedToOffers,
    ReserveAuctionResulted,
    ReservePriceUpdated
} from "../../../generated/KODAV3PrimaryMarketplace/KODAV3PrimaryMarketplace";

import {toEther} from "../../utils/utils";

import * as platformConfig from "../../services/PlatformConfig.factory";
import * as editionService from "../../services/Edition.service";
import * as tokenService from "../../services/Token.service";
import * as offerService from "../../services/Offers.service";
import * as dayService from "../../services/Day.service";
import * as auctionEventService from "../../services/AuctionEvent.service";
import * as auctionEventFactory from "../../services/AuctionEvent.factory";
import * as collectorService from "../../services/Collector.service";
import * as activityEventService from "../../services/ActivityEvent.service";
import * as artistService from "../../services/Artist.service";
import * as tokenEventFactory from "../../services/TokenEvent.factory";

import * as EVENT_TYPES from "../../utils/EventTypes";
import * as SaleTypes from "../../utils/SaleTypes";
import {recordPriceChanged} from "../../services/ActivityEvent.service";

export function handleAdminUpdateModulo(event: AdminUpdateModulo): void {
    log.info("KO V3 handleAdminUpdateModulo() called - modulo {}", [event.params._modulo.toString()]);
    let marketConfig = platformConfig.getPlatformConfig()
    marketConfig.modulo = event.params._modulo;
    marketConfig.save();
}

export function handleAdminUpdateMinBidAmount(event: AdminUpdateMinBidAmount): void {
    log.info("KO V3 handleAdminUpdateMinBidAmount() called - minBidAmount {}", [event.params._minBidAmount.toString()]);
    let marketConfig = platformConfig.getPlatformConfig()
    marketConfig.modulo = event.params._minBidAmount;
    marketConfig.save();
}

export function handleAdminUpdatePlatformPrimarySaleCommission(event: AdminUpdatePlatformPrimarySaleCommission): void {
    log.info("KO V3 handleAdminUpdatePlatformPrimarySaleCommission() called - platformPrimarySaleCommission {}", [event.params._platformPrimarySaleCommission.toString()]);
    let marketConfig = platformConfig.getPlatformConfig()
    marketConfig.primarySaleCommission = event.params._platformPrimarySaleCommission;
    marketConfig.save();
}

/////////////////////
// Edition Buy Now //
/////////////////////

export function handleEditionPriceChanged(event: BuyNowPriceChanged): void {
    log.info("KO V3 handleEditionPriceChanged() called -  editionId {}", [event.params._id.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );
    let editionEntity = editionService.loadOrCreateV3EditionFromTokenId(event.params._id, event.block, kodaV3Contract)
    editionEntity.priceInWei = event.params._price
    editionEntity.metadataPrice = event.params._price;

    activityEventService.recordPriceChanged(event, editionEntity, event.params._price)

    editionEntity.save()
}

export function handleEditionListed(event: ListedForBuyNow): void {
    log.info("KO V3 handleEditionListed() called - editionId {}", [event.params._id.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );
    let editionEntity = editionService.loadOrCreateV3EditionFromTokenId(event.params._id, event.block, kodaV3Contract)
    editionEntity.priceInWei = event.params._price;
    editionEntity.metadataPrice = event.params._price;
    editionEntity.startDate = event.params._startDate;
    editionEntity.salesType = SaleTypes.BUY_NOW

    // clear stepped sale
    editionEntity.stepSaleStepPrice = ZERO
    editionEntity.stepSaleBasePrice = ZERO
    editionEntity.currentStep = ZERO

    // clear offers
    editionEntity.offersOnly = false
    editionEntity.auctionEnabled = false

    editionEntity.save()
}

export function handleEditionPurchased(event: BuyNowPurchased): void {
    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );

    let editionId = kodaV3Contract.getEditionIdOfToken(event.params._tokenId)

    log.info("KO V3 handleEditionPurchased() called - edition Id {}", [editionId.toString()]);

    // Action edition data changes
    let editionEntity = editionService.loadNonNullableEdition(editionId.toString())

    // Create collector
    let collector = collectorService.loadOrCreateCollector(event.params._buyer, event.block);
    collector.save();

    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._price)
    editionEntity.save()

    let tokenTransferEvent = tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params._tokenId.toString(), event.params._buyer, event.params._price);
    tokenTransferEvent.save();

    // Set price against token
    let tokenEntity = tokenService.loadNonNullableToken(event.params._tokenId.toString())
    _handleTokenPrimarySale(tokenEntity, event.params._price)
    tokenEntity.save()

    // Record Artist Data
    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, editionEntity, event.params._tokenId, event.params._price, artistAddress, event.params._buyer);

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._price, event.params._buyer)
}

////////////////////
// Edition Offers //
////////////////////

export function handleEditionAcceptingOffer(event: EditionAcceptingOffer): void {
    log.info("KO V3 handleEditionAcceptingOffer() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );
    let editionEntity = editionService.loadOrCreateV3EditionFromTokenId(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.auctionEnabled = true
    editionEntity.startDate = event.params._startDate
    editionEntity.salesType = SaleTypes.OFFERS_ONLY
    editionEntity.offersOnly = true
    editionEntity.activeBid = null
    editionEntity.save()

    auctionEventService.removeActiveBidOnEdition(event.params._editionId)
    offerService.clearEditionOffer(event.block, event.params._editionId)

}

export function handleEditionBidPlaced(event: EditionBidPlaced): void {
    log.info("KO V3 handleEditionBidPlaced() called - editionId {}", [event.params._editionId.toString()]);

    let kodav3Marketplace = KODAV3PrimaryMarketplace.bind(event.address)

    let kodaV3Contract = KnownOriginV3.bind(kodav3Marketplace.koda())


    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.save()

    let auctionEvent = auctionEventFactory.createBidPlacedEvent(event, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id)
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidPlacedCount(event)

    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)
    dayService.recordDayTotalValuePlaceInBids(event, event.params._amount)

    // TODO ditch this field
    let offer = kodav3Marketplace.editionOffers(event.params._editionId)
    auctionEvent.lockupUntil = offer.value2

    auctionEventService.recordActiveEditionBid(event.params._editionId, auctionEvent)

    offerService.recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, offer.value2, event.params._editionId)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleEditionBidWithdrawn(event: EditionBidWithdrawn): void {
    log.info("KO V3 handleEditionBidWithdrawn() called - editionId {}", [event.params._editionId.toString()]);

    let editionEntity = editionService.loadNonNullableEdition(event.params._editionId.toString())

    let auctionEvent = auctionEventFactory.createBidWithdrawn(event, editionEntity, event.params._bidder);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id)
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidWithdrawnCount(event)

    auctionEventService.removeActiveBidOnEdition(event.params._editionId)
    offerService.clearEditionOffer(event.block, event.params._editionId)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
}

export function handleEditionBidAccepted(event: EditionBidAccepted): void {
    log.info("KO V3 handleEditionBidAccepted() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );

    let collector = collectorService.loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

    let editionEntity = editionService.loadNonNullableEdition(event.params._editionId.toString())

    let auctionEvent = auctionEventFactory.createBidAccepted(event, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    // Maintain bidding history list
    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id)
    editionEntity.biddingHistory = biddingHistory
    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._amount)
    editionEntity.save();

    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, editionEntity, event.params._tokenId, event.params._amount, artistAddress, event.params._bidder);

    dayService.recordDayBidAcceptedCount(event)
    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)

    auctionEventService.removeActiveBidOnEdition(event.params._editionId)
    offerService.clearEditionOffer(event.block, event.params._editionId)

    // Set price against token
    let tokenEntity = tokenService.loadOrCreateV3Token(event.params._tokenId, kodaV3Contract, event.block)
    _handleTokenPrimarySale(tokenEntity, event.params._amount)
    tokenEntity.save()

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_ACCEPTED, editionEntity, tokenEntity, event.params._amount, event.params._bidder)
    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._amount, event.params._bidder)
}

export function handleEditionBidRejected(event: EditionBidRejected): void {
    log.info("KO V3 handleEditionBidRejected() called - editionId {}", [event.params._editionId.toString()]);

    let editionEntity = editionService.loadNonNullableEdition(event.params._editionId.toString())

    let auctionEvent = auctionEventFactory.createBidRejected(event, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id)
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    dayService.recordDayBidRejectedCount(event)
    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)

    auctionEventService.removeActiveBidOnEdition(event.params._editionId)
    offerService.clearEditionOffer(event.block, event.params._editionId)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.BID_REJECTED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleEditionSteppedSaleBuy(event: EditionSteppedSaleBuy): void {
    log.info("KO V3 handleEditionSteppedSaleBuy() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );

    let collector = collectorService.loadOrCreateCollector(event.params._buyer, event.block);
    collector.save();

    let editionEntity = editionService.loadNonNullableEdition(event.params._editionId.toString())
    editionEntity.priceInWei = event.params._price.plus(editionEntity.stepSaleStepPrice || ZERO)
    editionEntity.metadataPrice = event.params._price.plus(editionEntity.stepSaleStepPrice || ZERO)
    editionEntity.currentStep = BigInt.fromI32(event.params._currentStep)
    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._price)
    editionEntity.save()

    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, editionEntity, event.params._tokenId, event.params._price, artistAddress, event.params._buyer);

    // Set price against token
    let tokenEntity = tokenService.loadOrCreateV3Token(event.params._tokenId, kodaV3Contract, event.block)
    _handleTokenPrimarySale(tokenEntity, event.params._price)
    tokenEntity.save()

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._price, event.params._buyer)
}

export function handleEditionSteppedSaleListed(event: EditionSteppedSaleListed): void {
    log.info("KO V3 handleEditionSteppedSaleListed() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    )
    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.stepSaleBasePrice = event.params._basePrice;
    editionEntity.stepSaleStepPrice = event.params._stepPrice;
    editionEntity.currentStep = ZERO // assume when listed we are on step 0
    editionEntity.salesType = SaleTypes.STEPPED_SALE
    editionEntity.startDate = event.params._startDate;
    editionEntity.priceInWei = event.params._basePrice
    editionEntity.metadataPrice = event.params._basePrice;

    // clear offers
    editionEntity.offersOnly = false
    editionEntity.auctionEnabled = false

    editionEntity.save()

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.STEPPED_AUCTION_LISTED, editionEntity, null, event.params._basePrice, ZERO_ADDRESS)
}

export function handleEditionSteppedAuctionUpdated(event: EditionSteppedAuctionUpdated): void {
    log.info("KO V3 handleEditionSteppedAuctionUpdated() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    )
    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.stepSaleBasePrice = event.params._basePrice;
    editionEntity.stepSaleStepPrice = event.params._stepPrice;
    editionEntity.priceInWei = event.params._basePrice
    editionEntity.metadataPrice = event.params._basePrice;

    editionEntity.save()

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PRICE_CHANGED, editionEntity, null, event.params._basePrice, ZERO_ADDRESS)
}

export function handleEditionListedForReserveAuction(event: ListedForReserveAuction): void {
    log.info("KO V3 handleEditionListedForReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(
        marketplace.koda()
    )

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)
    let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)

    editionEntity.reserveAuctionSeller = reserveAuction.value0
    editionEntity.reservePrice = event.params._reservePrice
    editionEntity.metadataPrice = event.params._reservePrice
    editionEntity.reserveAuctionStartDate = event.params._startDate
    editionEntity.startDate = event.params._startDate
    editionEntity.salesType = SaleTypes.RESERVE_COUNTDOWN_AUCTION

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.RESERVE_AUCTION_LISTED, editionEntity, null, event.params._reservePrice, ZERO_ADDRESS)

    editionEntity.save()
}

export function handleBidPlacedOnReserveAuction(event: BidPlacedOnReserveAuction): void {
    log.info("KO V3 handleBidPlacedOnReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)

    editionEntity.reserveAuctionBidder = event.params._bidder
    editionEntity.reserveAuctionBid = event.params._amount

    // Check if the bid has gone above or is equal to reserve price as this means that the countdown for auction end has started
    if (editionEntity.reserveAuctionBid.ge(editionEntity.reservePrice)) {
        let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)
        let bidEnd = reserveAuction.value5 // get the timestamp for the end of the reserve auction or when the bids end

        // these two values are the same until the point that someone bids near the end of the auction and the end of the auction is extended - sudden death
        editionEntity.previousReserveAuctionEndTimestamp = editionEntity.reserveAuctionEndTimestamp.equals(ZERO)
            ? bidEnd
            : editionEntity.reserveAuctionEndTimestamp

        editionEntity.reserveAuctionEndTimestamp = bidEnd

        activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.RESERVE_COUNTDOWN_STARTED, editionEntity, null, editionEntity.reserveAuctionBid, event.params._bidder)

        // when the two values above are not the same, auction has been extended
        if (editionEntity.previousReserveAuctionEndTimestamp.notEqual(editionEntity.reserveAuctionEndTimestamp)) {
            editionEntity.reserveAuctionNumTimesExtended = editionEntity.reserveAuctionNumTimesExtended.plus(ONE)
            editionEntity.isReserveAuctionInSuddenDeath = true
            editionEntity.reserveAuctionTotalExtensionLengthInSeconds = editionEntity.reserveAuctionTotalExtensionLengthInSeconds.plus(editionEntity.reserveAuctionEndTimestamp.minus(
                editionEntity.previousReserveAuctionEndTimestamp
            ))

            activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.RESERVE_EXTENDED, editionEntity, null, editionEntity.reserveAuctionBid, event.params._bidder)
        }
    }

    editionEntity.save()

    dayService.recordDayBidPlacedCount(event)

    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)
    dayService.recordDayTotalValuePlaceInBids(event, event.params._amount)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.RESERVE_BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)

    let auctionEvent = auctionEventFactory.createBidPlacedEvent(event, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id)
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    auctionEventService.recordActiveEditionBid(event.params._id, auctionEvent)

    offerService.recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, null, event.params._id)
}

export function handleReserveAuctionResulted(event: ReserveAuctionResulted): void {
    log.info("KO V3 handleReserveAuctionResulted() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)

    editionEntity.isReserveAuctionResulted = true
    editionEntity.isReserveAuctionResultedDateTime = event.block.timestamp
    editionEntity.reserveAuctionResulter = event.params._resulter

    // Create collector
    let collector = collectorService.loadOrCreateCollector(event.params._winner, event.block);
    collector.save();

    let auctionEvent = auctionEventFactory.createBidAccepted(event, editionEntity, event.params._winner, event.params._finalPrice);
    auctionEvent.save()

    // Maintain bidding history list
    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id)
    editionEntity.biddingHistory = biddingHistory

    _handleEditionPrimarySale(editionEntity, collector, event.params._id, event.params._finalPrice)
    editionEntity.save()

    let tokenTransferEvent = tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params._id.toString(), event.params._winner, event.params._finalPrice);
    tokenTransferEvent.save();

    // Set price against token
    let tokenEntity = tokenService.loadNonNullableToken(event.params._id.toString())
    _handleTokenPrimarySale(tokenEntity, event.params._finalPrice)
    tokenEntity.save()

    // Record Artist Data
    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, editionEntity, event.params._id, event.params._finalPrice, artistAddress, event.params._winner);

    dayService.recordDayBidAcceptedCount(event)
    auctionEventService.removeActiveBidOnEdition(event.params._id)
    offerService.clearEditionOffer(event.block, event.params._id)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._finalPrice, event.params._winner)
}

export function handleBidWithdrawnFromReserveAuction(event: BidWithdrawnFromReserveAuction): void {
    log.info("KO V3 handleBidWithdrawnFromReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)
    editionEntity.reserveAuctionBidder = ZERO_ADDRESS
    editionEntity.reserveAuctionBid = ZERO
    editionEntity.save()

    dayService.recordDayBidWithdrawnCount(event)

    auctionEventService.removeActiveBidOnEdition(event.params._id)
    offerService.clearEditionOffer(event.block, event.params._id)

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.RESERVE_BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
}

export function handleReservePriceUpdated(event: ReservePriceUpdated): void {
    log.info("KO V3 handleReservePriceUpdated() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)

    editionEntity.reservePrice = event.params._reservePrice
    editionEntity.metadataPrice = event.params._reservePrice

    // Check if the current bid has gone above or is equal to reserve price as this means that the countdown for auction end has started
    if (editionEntity.reserveAuctionBid.ge(event.params._reservePrice)) {
        let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)
        let bidEnd = reserveAuction.value5 // get the timestamp for the end of the reserve auction or when the bids end

        // these two values are the same until the point that someone bids near the end of the auction and the end of the auction is extended - sudden death
        editionEntity.previousReserveAuctionEndTimestamp = bidEnd
        editionEntity.reserveAuctionEndTimestamp = bidEnd
    }

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.RESERVE_PRICE_CHANGED, editionEntity, null, event.params._reservePrice, ZERO_ADDRESS)

    editionEntity.save()
}

export function handleEmergencyBidWithdrawFromReserveAuction(event: EmergencyBidWithdrawFromReserveAuction): void {
    log.info("KO V3 handleEmergencyBidWithdrawFromReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)
    // Clear down all reserve auction fields
    editionEntity.reserveAuctionCanEmergencyExit = false
    editionEntity.reserveAuctionBid = ZERO
    editionEntity.reserveAuctionSeller = ZERO_ADDRESS
    editionEntity.reserveAuctionBidder = ZERO_ADDRESS
    editionEntity.reserveAuctionEndTimestamp = ZERO
    editionEntity.reservePrice = ZERO
    editionEntity.metadataPrice = ZERO
    editionEntity.reserveAuctionBid = ZERO
    editionEntity.reserveAuctionStartDate = ZERO
    editionEntity.previousReserveAuctionEndTimestamp = ZERO
    editionEntity.reserveAuctionEndTimestamp = ZERO
    editionEntity.reserveAuctionNumTimesExtended = ZERO
    editionEntity.isReserveAuctionInSuddenDeath = false
    editionEntity.reserveAuctionTotalExtensionLengthInSeconds = ZERO
    editionEntity.isReserveAuctionResulted = false
    editionEntity.isReserveAuctionResultedDateTime = ZERO
    editionEntity.reserveAuctionResulter = ZERO_ADDRESS

    editionEntity.save()
}

export function handleEditionConvertedFromOffersToBuyItNow(event: EditionConvertedFromOffersToBuyItNow): void {
    log.info("KO V3 handleEditionConvertedFromOffersToBuyItNow() called - editionId {}", [event.params._editionId.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.salesType = SaleTypes.BUY_NOW
    editionEntity.offersOnly = false
    editionEntity.priceInWei = event.params._price
    editionEntity.metadataPrice = event.params._price;
    editionEntity.startDate = event.params._startDate
    editionEntity.auctionEnabled = false

    auctionEventService.removeActiveBidOnEdition(event.params._editionId)
    offerService.clearEditionOffer(event.block, event.params._editionId)

    editionEntity.save()
}

export function handleConvertFromBuyNowToOffers(event: ConvertFromBuyNowToOffers): void {
    log.info("KO V3 handleConvertFromBuyNowToOffers() called - editionId {}", [event.params._editionId.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.salesType = SaleTypes.OFFERS_ONLY
    editionEntity.startDate = event.params._startDate
    editionEntity.auctionEnabled = true

    activityEventService.recordSalesTypeChange(event, editionEntity)

    editionEntity.save()
}

export function handleConvertSteppedAuctionToBuyNow(event: ConvertSteppedAuctionToBuyNow): void {
    log.info("KO V3 handleConvertSteppedAuctionToBuyNow() called - editionId {}", [event.params._editionId.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.salesType = SaleTypes.BUY_NOW
    editionEntity.startDate = event.params._startDate
    editionEntity.priceInWei = event.params._listingPrice
    editionEntity.metadataPrice = event.params._listingPrice
    editionEntity.auctionEnabled = false

    editionEntity.save()
}

export function handleReserveAuctionConvertedToBuyItNow(event: ReserveAuctionConvertedToBuyItNow): void {
    log.info("KO V3 handleReserveAuctionConvertedToBuyItNow() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)
    editionEntity.salesType = SaleTypes.BUY_NOW
    editionEntity.startDate = event.params._startDate
    editionEntity.priceInWei = event.params._listingPrice
    editionEntity.metadataPrice = event.params._listingPrice
    editionEntity.auctionEnabled = false

    _clearReserveAuctionFields(editionEntity)

    editionEntity.save()
}

export function handleReserveAuctionConvertedToOffers(event: ReserveAuctionConvertedToOffers): void {
    log.info("KO V3 handleReserveAuctionConvertedToOffers() called - editionId {}", [event.params._editionId.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let editionEntity = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.salesType = SaleTypes.OFFERS_ONLY
    editionEntity.startDate = event.params._startDate
    editionEntity.auctionEnabled = true

    _clearReserveAuctionFields(editionEntity)

    editionEntity.save()
}


export function _handleEditionPrimarySale(editionEntity: Edition, collector: Collector, tokenId: BigInt, price: BigInt): void {

    // Count total sale value
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition.plus(toEther(price));

    // N:B - tally up totalSupply & remainingSupply in the transfer method and not here

    // Total sold
    editionEntity.totalSold = editionEntity.totalSold.plus(ONE)

    // Tally up primary sale owners
    if (!collectorService.collectorInList(collector, editionEntity.primaryOwners)) {
        let primaryOwners = editionEntity.primaryOwners;
        primaryOwners.push(collector.id);
        editionEntity.primaryOwners = primaryOwners;
    }

    // Record sale against the edition
    let sales = editionEntity.sales
    sales.push(Bytes.fromI32(tokenId))
    editionEntity.sales = sales
}

export function _handleTokenPrimarySale(tokenEntity: Token, price: BigInt): void {
    tokenService.recordTokenSaleMetrics(tokenEntity, price, true)
}

export function _handleArtistAndDayCounts(event: ethereum.Event, editionEntity: Edition, tokenId: BigInt, price: BigInt, artistAddress: Address, buyer: Address): void {
    dayService.recordDayValue(event, tokenId, price)
    dayService.recordDayCounts(event, price)

    // record running total of issued tokens
    dayService.recordDayIssued(event, tokenId)

    artistService.recordArtistIssued(artistAddress)
    artistService.handleKodaV3CommissionSplit(artistAddress, tokenId, price, editionEntity.collective, true)

    collectorService.addPrimarySaleToCollector(event.block, buyer, price);
}

function _clearReserveAuctionFields(editionEntity: Edition): void {
    editionEntity.reserveAuctionBidder = ZERO_ADDRESS
    editionEntity.reserveAuctionBid = ZERO
    editionEntity.isReserveAuctionResulted = false
    editionEntity.isReserveAuctionResultedDateTime = ZERO
    editionEntity.reserveAuctionSeller = ZERO_ADDRESS
    editionEntity.reservePrice = ZERO
    editionEntity.metadataPrice = ZERO
    editionEntity.reserveAuctionResulter = ZERO_ADDRESS
    editionEntity.reserveAuctionBid = ZERO
    editionEntity.reserveAuctionStartDate = ZERO
    editionEntity.previousReserveAuctionEndTimestamp = ZERO
    editionEntity.reserveAuctionEndTimestamp = ZERO
    editionEntity.reserveAuctionNumTimesExtended = ZERO
    editionEntity.isReserveAuctionInSuddenDeath = false
    editionEntity.reserveAuctionTotalExtensionLengthInSeconds = ZERO
    editionEntity.reserveAuctionCanEmergencyExit = false
}
