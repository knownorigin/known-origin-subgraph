import {ONE, ZERO, ZERO_ADDRESS} from "../utils/constants";
import {KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";
import {Address, ethereum, log} from "@graphprotocol/graph-ts/index";
import {BigInt} from "@graphprotocol/graph-ts";
import {
    EditionAcceptingOffer,
    EditionBidAccepted,
    EditionBidPlaced,
    EditionBidRejected,
    EditionBidWithdrawn,
    ListedForBuyNow,
    BuyNowPriceChanged,
    BuyNowPurchased,
    AdminUpdateModulo,
    AdminUpdateMinBidAmount,
    AdminUpdatePlatformPrimarySaleCommission,
    KODAV3PrimaryMarketplace,
    EditionSteppedSaleBuy,
    EditionSteppedSaleListed,
    ListedForReserveAuction,
    BidPlacedOnReserveAuction,
    ReserveAuctionResulted,
    BidWithdrawnFromReserveAuction
} from "../../generated/KODAV3PrimaryMarketplace/KODAV3PrimaryMarketplace";

import {getPlatformConfig} from "../services/PlatformConfig.factory";
import {toEther} from "../utils/utils";

import {
    loadNonNullableEdition, loadOrCreateV3Edition,
    loadOrCreateV3EditionFromTokenId
} from "../services/Edition.service";
import {
    createBidAccepted,
    createBidPlacedEvent,
    createBidRejected,
    createBidWithdrawn
} from "../services/AuctionEvent.factory";
import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount, recordDayBidRejectedCount, recordDayBidWithdrawnCount, recordDayCounts, recordDayIssued,
    recordDayTotalValueCycledInBids,
    recordDayTotalValuePlaceInBids, recordDayValue
} from "../services/Day.service";
import {recordActiveEditionBid, removeActiveBidOnEdition} from "../services/AuctionEvent.service";

import {clearEditionOffer, recordEditionOffer} from "../services/Offers.service";
import {addPrimarySaleToCollector, collectorInList, loadOrCreateCollector} from "../services/Collector.service";
import {recordArtistCounts, recordArtistIssued, recordArtistValue} from "../services/Artist.service";
import {loadNonNullableToken, loadOrCreateV3Token} from "../services/Token.service";
import {createTokenPrimaryPurchaseEvent} from "../services/TokenEvent.factory";

import {recordPrimarySaleEvent} from "../services/ActivityEvent.service";
import * as EVENT_TYPES from "../utils/EventTypes";
import * as SaleTypes from "../utils/SaleTypes";
import {Collector, Edition, Token} from "../../generated/schema";

export function handleAdminUpdateModulo(event: AdminUpdateModulo): void {
    log.info("KO V3 handleAdminUpdateModulo() called - modulo {}", [event.params._modulo.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.modulo = event.params._modulo;
    marketConfig.save();
}

export function handleAdminUpdateMinBidAmount(event: AdminUpdateMinBidAmount): void {
    log.info("KO V3 handleAdminUpdateMinBidAmount() called - minBidAmount {}", [event.params._minBidAmount.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.modulo = event.params._minBidAmount;
    marketConfig.save();
}

export function handleAdminUpdatePlatformPrimarySaleCommission(event: AdminUpdatePlatformPrimarySaleCommission): void {
    log.info("KO V3 handleAdminUpdatePlatformPrimarySaleCommission() called - platformPrimarySaleCommission {}", [event.params._platformPrimarySaleCommission.toString()]);
    let marketConfig = getPlatformConfig()
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
    let editionEntity = loadOrCreateV3EditionFromTokenId(event.params._id, event.block, kodaV3Contract)
    editionEntity.priceInWei = event.params._price;
    editionEntity.save()
}

export function handleEditionListed(event: ListedForBuyNow): void {
    log.info("KO V3 handleEditionListed() called - editionId {}", [event.params._id.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );
    let editionEntity = loadOrCreateV3EditionFromTokenId(event.params._id, event.block, kodaV3Contract)
    editionEntity.priceInWei = event.params._price;
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
    let editionEntity = loadNonNullableEdition(editionId)

    // Create collector
    let collector = loadOrCreateCollector(event.params._buyer, event.block);
    collector.save();

    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._price)
    editionEntity.save()

    let tokenTransferEvent = createTokenPrimaryPurchaseEvent(event, event.params._tokenId, event.params._buyer, event.params._price);
    tokenTransferEvent.save();

    // Set price against token
    let tokenEntity = loadNonNullableToken(event.params._tokenId)
    _handleTokenPrimarySale(tokenEntity, event.params._price)
    tokenEntity.save()

    // Record Artist Data
    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, event.params._tokenId, event.params._price, artistAddress, event.params._buyer);

    recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._price, event.params._buyer)
}

////////////////////
// Edition Offers //
////////////////////

export function handleEditionAcceptingOffer(event: EditionAcceptingOffer): void {
    log.info("KO V3 handleEditionAcceptingOffer() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );
    let editionEntity = loadOrCreateV3EditionFromTokenId(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.auctionEnabled = true
    editionEntity.salesType = SaleTypes.OFFERS_ONLY
    editionEntity.offersOnly = true
    editionEntity.auctionEnabled = true
    editionEntity.activeBid = null

    removeActiveBidOnEdition(event.params._editionId)
    clearEditionOffer(event.block, event.params._editionId)

    editionEntity.save()
}

export function handleEditionBidPlaced(event: EditionBidPlaced): void {
    log.info("KO V3 handleEditionBidPlaced() called - editionId {}", [event.params._editionId.toString()]);

    let kodav3Marketplace = KODAV3PrimaryMarketplace.bind(event.address)

    let kodaV3Contract = KnownOriginV3.bind(kodav3Marketplace.koda())


    let editionEntity = loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.save()

    let auctionEvent = createBidPlacedEvent(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidPlacedCount(event)

    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    let offer = kodav3Marketplace.editionOffers(event.params._editionId)
    auctionEvent.lockupUntil = offer.value2

    recordActiveEditionBid(event.params._editionId, auctionEvent)

    recordEditionOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._editionId)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_PLACED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleEditionBidWithdrawn(event: EditionBidWithdrawn): void {
    log.info("KO V3 handleEditionBidWithdrawn() called - editionId {}", [event.params._editionId.toString()]);

    let editionEntity = loadNonNullableEdition(event.params._editionId)

    let auctionEvent = createBidWithdrawn(event.block, event.transaction, editionEntity, event.params._bidder);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidWithdrawnCount(event)

    removeActiveBidOnEdition(event.params._editionId)
    clearEditionOffer(event.block, event.params._editionId)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_WITHDRAWN, editionEntity, null, null, event.params._bidder)
}

export function handleEditionBidAccepted(event: EditionBidAccepted): void {
    log.info("KO V3 handleEditionBidAccepted() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );

    let collector = loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

    let editionEntity = loadNonNullableEdition(event.params._editionId)

    let auctionEvent = createBidAccepted(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    // Maintain bidding history list
    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._amount)
    editionEntity.save();

    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, event.params._tokenId, event.params._amount, artistAddress, event.params._bidder);

    recordDayBidAcceptedCount(event)
    recordDayTotalValueCycledInBids(event, event.params._amount)

    removeActiveBidOnEdition(event.params._editionId)
    clearEditionOffer(event.block, event.params._editionId)

    // Set price against token
    let tokenEntity = loadOrCreateV3Token(event.params._tokenId, kodaV3Contract, event.block)
    _handleTokenPrimarySale(tokenEntity, event.params._amount)
    tokenEntity.save()

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_ACCEPTED, editionEntity, tokenEntity, event.params._amount, event.params._bidder)
    recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._amount, event.params._bidder)
}

export function handleEditionBidRejected(event: EditionBidRejected): void {
    log.info("KO V3 handleEditionBidRejected() called - editionId {}", [event.params._editionId.toString()]);

    let editionEntity = loadNonNullableEdition(event.params._editionId)

    let auctionEvent = createBidRejected(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidRejectedCount(event)
    recordDayTotalValueCycledInBids(event, event.params._amount)

    removeActiveBidOnEdition(event.params._editionId)
    clearEditionOffer(event.block, event.params._editionId)

    recordPrimarySaleEvent(event, EVENT_TYPES.BID_REJECTED, editionEntity, null, event.params._amount, event.params._bidder)
}

export function handleEditionSteppedSaleBuy(event: EditionSteppedSaleBuy): void {
    log.info("KO V3 handleEditionSteppedSaleBuy() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    );

    let collector = loadOrCreateCollector(event.params._buyer, event.block);
    collector.save();

    let editionEntity = loadNonNullableEdition(event.params._editionId)
    editionEntity.priceInWei = event.params._price.plus(editionEntity.stepSaleStepPrice || ZERO)
    editionEntity.currentStep = BigInt.fromI32(event.params._currentStep)
    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._price)
    editionEntity.save()

    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, event.params._tokenId, event.params._price, artistAddress, event.params._buyer);

    // Set price against token
    let tokenEntity = loadOrCreateV3Token(event.params._tokenId, kodaV3Contract, event.block)
    _handleTokenPrimarySale(tokenEntity, event.params._price)
    tokenEntity.save()

    recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._price, event.params._buyer)
}

export function handleEditionSteppedSaleListed(event: EditionSteppedSaleListed): void {
    log.info("KO V3 handleEditionSteppedSaleListed() called - editionId {}", [event.params._editionId.toString()]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3PrimaryMarketplace.bind(event.address).koda()
    )
    let editionEntity = loadOrCreateV3Edition(event.params._editionId, event.block, kodaV3Contract)
    editionEntity.stepSaleBasePrice = event.params._basePrice;
    editionEntity.stepSaleStepPrice = event.params._stepPrice;
    editionEntity.currentStep = ZERO // assume when listed we are on step 0
    editionEntity.salesType = SaleTypes.STEPPED_SALE
    editionEntity.startDate = event.params._startDate;
    editionEntity.priceInWei = event.params._basePrice

    // clear offers
    editionEntity.offersOnly = false
    editionEntity.auctionEnabled = false

    editionEntity.save()
}

export function handleEditionListedForReserveAuction(event: ListedForReserveAuction): void {
    log.info("KO V3 handleEditionListedForReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(
        marketplace.koda()
    )

    let editionEntity = loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)
    let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)

    editionEntity.reserveAuctionSeller = reserveAuction.value0
    editionEntity.reservePrice = event.params._reservePrice
    editionEntity.reserveAuctionStartDate = event.params._startDate

    editionEntity.save()
}

export function handleBidPlacedOnReserveAuction(event: BidPlacedOnReserveAuction): void {
    log.info("KO V3 handleBidPlacedOnReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(
        marketplace.koda()
    )

    let editionEntity = loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)

    editionEntity.reserveAuctionBidder = event.params._bidder
    editionEntity.reserveAuctionBid = event.params._amount

    // Check if the bid has gone above or is equal to reserve price as this means that the countdown for auction end has started
    if (editionEntity.reserveAuctionBid.ge(editionEntity.reservePrice)) {
        let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)
        let bidEnd = reserveAuction.value5 // get the timestamp for the end of the reserve auction or when the bids end

        // these two values are the same until the point that someone bids near the end of the auction and the end of the auction is extended - sudden death
        editionEntity.lastReserveAuctionEndTimestamp = editionEntity.currentReserveAuctionEndTimestamp.equals(ZERO) ? bidEnd : editionEntity.currentReserveAuctionEndTimestamp
        editionEntity.currentReserveAuctionEndTimestamp = bidEnd

        // when the two values above are not the same, auction has been extended
        if (editionEntity.lastReserveAuctionEndTimestamp.notEqual(editionEntity.currentReserveAuctionEndTimestamp)) {
            editionEntity.reserveAuctionNumTimesExtended = editionEntity.reserveAuctionNumTimesExtended.plus(ONE)
            editionEntity.reserveAuctionTotalExtensionLengthInSeconds = editionEntity.currentReserveAuctionEndTimestamp.minus(
                editionEntity.lastReserveAuctionEndTimestamp
            )
        }
    }

    editionEntity.save()
}

function handleReserveAuctionResulted(event: ReserveAuctionResulted): void {
    log.info("KO V3 handleReserveAuctionResulted() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(
        marketplace.koda()
    )

    let editionEntity = loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)

    editionEntity.isReserveAuctionResulted = true
    editionEntity.reserveAuctionResulter = event.params._resulter

    editionEntity.save()
}

function handleBidWithdrawnFromReserveAuction(event: BidWithdrawnFromReserveAuction): void {
    log.info("KO V3 handleBidWithdrawnFromReserveAuction() called - editionId {}", [event.params._id.toString()]);

    let marketplace = KODAV3PrimaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(
        marketplace.koda()
    )

    let editionEntity = loadOrCreateV3Edition(event.params._id, event.block, kodaV3Contract)

    editionEntity.reserveAuctionBidder = ZERO_ADDRESS
    editionEntity.reserveAuctionBid = ZERO

    editionEntity.save()
}

function _handleEditionPrimarySale(editionEntity: Edition, collector: Collector, tokenId: BigInt, price: BigInt): void {

    // Count total sale value
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition.plus(toEther(price));

    // Record supply being consumed (useful to know how many are left in a edition i.e. available = supply = remaining)
    editionEntity.totalSupply = editionEntity.totalSupply.plus(ONE)

    // Reduce remaining supply for each mint
    editionEntity.remainingSupply = editionEntity.remainingSupply.minus(ONE)

    // Total sold
    editionEntity.totalSold = editionEntity.totalSold.plus(ONE)

    // Tally up primary sale owners
    if (!collectorInList(collector, editionEntity.primaryOwners)) {
        let primaryOwners = editionEntity.primaryOwners;
        primaryOwners.push(collector.id);
        editionEntity.primaryOwners = primaryOwners;
    }

    // Record sale against the edition
    let sales = editionEntity.sales
    sales.push(tokenId.toString())
    editionEntity.sales = sales
}

function _handleTokenPrimarySale(tokenEntity: Token, price: BigInt): void {
    tokenEntity.primaryValueInEth = toEther(price)
    tokenEntity.lastSalePriceInEth = toEther(price)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(price))
}

function _handleArtistAndDayCounts(event: ethereum.Event, tokenId: BigInt, price: BigInt, artistAddress: Address, buyer: Address): void {
    recordDayValue(event, tokenId, price)
    recordDayCounts(event, price)

    // record running total of issued tokens
    recordDayIssued(event, tokenId)

    recordArtistIssued(artistAddress)
    recordArtistCounts(artistAddress, price)
    recordArtistValue(artistAddress, tokenId, price)

    addPrimarySaleToCollector(event.block, buyer, price);
}
