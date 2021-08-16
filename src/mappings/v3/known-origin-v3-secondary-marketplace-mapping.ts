import {Address, BigInt, log, store} from "@graphprotocol/graph-ts/index";
import {
    AdminUpdateSecondarySaleCommission,
    AdminUpdateModulo,
    AdminUpdateMinBidAmount,
    TokenBidWithdrawn,
    TokenBidRejected,
    TokenBidPlaced,
    TokenBidAccepted,
    BuyNowPurchased,
    TokenDeListed,
    ListedForBuyNow,
    KODAV3SecondaryMarketplace,
    BuyNowPriceChanged
} from "../../../generated/KODAV3SecondaryMarketplace/KODAV3SecondaryMarketplace";

import {getPlatformConfig} from "../../services/PlatformConfig.factory";
import {loadNonNullableToken} from "../../services/Token.service";
import {toEther} from "../../utils/utils";
import {
    addSecondaryPurchaseToCollector,
    addSecondarySaleToSeller,
    loadOrCreateCollector
} from "../../services/Collector.service";
import {Edition, ListedToken, TokenOffer} from "../../../generated/schema";
import {loadOrCreateListedToken} from "../../services/ListedToken.service";
import {ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../../utils/constants";
import {
    recordSecondaryBidAccepted,
    recordSecondaryBidPlaced,
    recordSecondaryBidRejected,
    recordSecondaryBidWithdrawn,
    recordSecondarySale,
    recordSecondaryTokenDeListed,
    recordSecondaryTokenListed,
    recordSecondaryTokenListingPriceChange,
    recordSecondaryTokenReserveAuctionBidPlaced,
    recordSecondaryTokenReserveAuctionCountdownStarted,
    recordSecondaryTokenReserveAuctionExtended,
    recordSecondaryTokenReserveAuctionListed,
} from "../../services/ActivityEvent.service";
import {clearTokenOffer, recordTokenOffer} from "../../services/Offers.service";
import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidRejectedCount,
    recordDayBidWithdrawnCount,
    recordDayCounts, recordDaySecondaryTotalValue, recordDayTotalValueCycledInBids, recordDayTotalValuePlaceInBids,
    recordDayValue
} from "../../services/Day.service";
import {
    createBidAcceptedEvent,
    createBidPlacedEvent,
    createBidRejectedEvent,
    createBidWithdrawnEvent,
} from "../../services/TokenEvent.factory";
import * as KodaVersions from "../../utils/KodaVersions";
import * as SaleTypes from "../../utils/SaleTypes";
import {
    BidPlacedOnReserveAuction,
    BidWithdrawnFromReserveAuction,
    EmergencyBidWithdrawFromReserveAuction,
    ListedForReserveAuction,
    ReserveAuctionResulted,
    ReservePriceUpdated,
    ReserveAuctionConvertedToBuyItNow,
    ReserveAuctionConvertedToOffers
} from "../../../generated/KODAV3SecondaryMarketplace/KODAV3SecondaryMarketplace";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";
import {OFFERS_ONLY, RESERVE_COUNTDOWN_AUCTION} from "../../utils/SaleTypes";

export function handleAdminUpdateSecondarySaleCommission(event: AdminUpdateSecondarySaleCommission): void {
    log.info("KO V3 handleAdminUpdatePlatformPrimarySaleCommission() called - platformSecondarySaleCommission {}", [event.params._platformSecondarySaleCommission.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.marketplaceSecondarySaleRoyalty = event.params._platformSecondarySaleCommission;
    marketConfig.save();
}

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

export function handleTokenListed(event: ListedForBuyNow): void {
    log.info("KO V3 handleTokenListed() called - tokenId {}", [event.params._id.toString()]);

    let contract = KODAV3SecondaryMarketplace.bind(event.address)
    let listing = contract.editionOrTokenListings(event.params._id)
    let listingSeller = listing.value2

    let token = loadNonNullableToken(event.params._id)
    token.isListed = true;
    token.salesType = SaleTypes.BUY_NOW
    token.listPrice = toEther(event.params._price)
    token.lister = loadOrCreateCollector(listingSeller, event.block).id
    token.listingTimestamp = event.block.timestamp
    token.save()

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition);
    listedToken.listPrice = toEther(event.params._price)
    listedToken.lister = loadOrCreateCollector(listingSeller, event.block).id
    listedToken.listingTimestamp = event.block.timestamp

    // Add filter flags
    let biggestTokenId: BigInt = edition.editionNmber.plus(edition.totalAvailable);
    let firstTokenId = edition.editionNmber.plus(ONE);

    listedToken.seriesNumber = event.params._id.minus(edition.editionNmber)
    listedToken.isFirstEdition = firstTokenId.equals(event.params._id)
    listedToken.isLastEdition = biggestTokenId.equals(event.params._id)
    listedToken.isGenesisEdition = edition.isGenesisEdition
    log.info("Token ID={} | biggestTokenId={} | seriesNumber={} | editionSize={} | totalIssued={} ", [
        event.params._id.toString(),
        biggestTokenId.toString(),
        listedToken.seriesNumber.toString(),
        edition.totalAvailable.toString(),
        edition.totalSupply.toString()
    ]);
    listedToken.save();

    // Save the lister
    let collector = loadOrCreateCollector(listingSeller, event.block);
    collector.save();

    recordSecondaryTokenListed(event, token, edition, event.params._price, listingSeller)
    token.save()
}

export function handleTokenDeListed(event: TokenDeListed): void {
    log.info("KO V3 handleTokenDeListed() called - tokenId {}", [event.params._tokenId.toString()]);
    let token = loadNonNullableToken(event.params._tokenId)

    token.isListed = false;
    token.salesType = SaleTypes.OFFERS_ONLY
    token.listPrice = ZERO_BIG_DECIMAL
    token.lister = null
    token.listingTimestamp = ZERO

    // Remove ListedToken from store
    store.remove("ListedToken", event.params._tokenId.toString());

    // if value is found this means a buy has happened so we dont want to include an extra event in the histories
    if (event.transaction.value === ZERO) {
        let edition = Edition.load(token.edition) as Edition
        recordSecondaryTokenDeListed(event, token, Address.fromString(token.currentOwner), edition)
    }

    token.save()
}

export function handleTokenPurchased(event: BuyNowPurchased): void {
    log.info("KO V3 handleTokenPurchased() called - tokenId {}", [event.params._tokenId.toString()]);

    let token = loadNonNullableToken(event.params._tokenId)
    let edition = Edition.load(token.edition) as Edition

    token.isListed = false;
    token.salesType = SaleTypes.OFFERS_ONLY
    token.currentOwner = loadOrCreateCollector(event.params._buyer, event.block).id
    token.lastSalePriceInEth = toEther(event.params._price)
    token.totalPurchaseCount = token.totalPurchaseCount.plus(ONE)
    token.totalPurchaseValue = token.totalPurchaseValue.plus(toEther(event.params._price))
    token.listPrice = ZERO_BIG_DECIMAL
    token.lister = null
    token.listingTimestamp = ZERO

    // Remove token listing from store
    store.remove("ListedToken", event.params._tokenId.toString());

    // counts and offers
    clearTokenOffer(event.block, event.params._tokenId)
    recordDayCounts(event, event.params._price)
    recordDayValue(event, event.params._tokenId, event.params._price)

    // Save the collector
    let buyer = loadOrCreateCollector(event.params._buyer, event.block);
    buyer.save();

    // Save the seller
    let contract = KODAV3SecondaryMarketplace.bind(event.address)
    let listing = contract.editionOrTokenListings(event.params._tokenId)
    let listingSeller = listing.value2
    let seller = loadOrCreateCollector(listingSeller, event.block);
    seller.save();

    recordSecondarySale(event, token, edition, event.params._price, event.params._buyer, listingSeller)

    token.save()
}

export function handleTokenBidPlaced(event: TokenBidPlaced): void {
    log.info("KO V3 handleTokenBidPlaced() called - tokenId {}", [event.params._tokenId.toString()]);

    createBidPlacedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)

    let timestamp = event.block.timestamp
    let id = timestamp.toString().concat(event.params._tokenId.toHexString())

    let token = loadNonNullableToken(event.params._tokenId)
    token.currentTopBidder = event.params._bidder
    token.save()

    let edition = Edition.load(token.edition) as Edition

    let tokenOffer = new TokenOffer(id);
    tokenOffer.version = KodaVersions.KODA_V3
    tokenOffer.timestamp = timestamp;
    tokenOffer.edition = edition.id
    tokenOffer.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenOffer.ethValue = toEther(event.params._amount)
    tokenOffer.ownerAtTimeOfBid = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenOffer.token = token.id
    tokenOffer.save()

    token.openOffer = tokenOffer.id
    token.save();

    recordDayBidPlacedCount(event)
    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    let contract = KODAV3SecondaryMarketplace.bind(event.address)
    let offerRecordedInContract = contract.tokenBids(event.params._tokenId)

    recordTokenOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._tokenId, offerRecordedInContract.value2);

    recordSecondaryBidPlaced(event, token, edition, event.params._amount, event.params._bidder)
}

export function handleTokenBidAccepted(event: TokenBidAccepted): void {
    log.info("KO V3 handleTokenBidAccepted() called - tokenId {}", [event.params._tokenId.toString()]);

    createBidAcceptedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)
    clearTokenOffer(event.block, event.params._tokenId)

    let token = loadNonNullableToken(event.params._tokenId)
    token.openOffer = null
    token.currentTopBidder = null
    token.currentOwner = loadOrCreateCollector(event.params._bidder, event.block).id
    token.lastSalePriceInEth = toEther(event.params._amount)
    token.totalPurchaseCount = token.totalPurchaseCount.plus(ONE)
    token.totalPurchaseValue = token.totalPurchaseValue.plus(toEther(event.params._amount))
    token.save();

    // Save the collector
    let collector = loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

    // BidAccepted emit Transfer events - handle day counts for monetary values in here
    recordDayBidAcceptedCount(event)
    recordDayCounts(event, event.params._amount)
    recordDayValue(event, event.params._tokenId, event.params._amount)
    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDaySecondaryTotalValue(event, event.params._amount)

    addSecondarySaleToSeller(event.block, event.params._currentOwner, event.params._amount);
    addSecondaryPurchaseToCollector(event.block, event.params._bidder, event.params._amount);

    // FIXME only record artist royalties
    // recordArtistValue(edition.artistAccount, event.params._tokenId, event.params._amount)
    // recordArtistCounts(edition.artistAccount, event.params._amount)

    // Edition updates
    let edition = Edition.load(token.edition) as Edition
    edition.save();

    recordSecondaryBidAccepted(event, token, edition, event.params._amount, event.params._bidder, event.params._currentOwner)
}

export function handleTokenBidRejected(event: TokenBidRejected): void {
    log.info("KO V3 handleTokenBidRejected() called - tokenId {}", [event.params._tokenId.toString()]);

    createBidRejectedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)
    clearTokenOffer(event.block, event.params._tokenId)

    let token = loadNonNullableToken(event.params._tokenId)
    token.openOffer = null
    token.currentTopBidder = null
    token.save();

    let edition = Edition.load(token.edition) as Edition

    recordDayBidRejectedCount(event)
    recordSecondaryBidRejected(event, token, edition, event.params._amount, event.params._bidder)
}

export function handleTokenBidWithdrawn(event: TokenBidWithdrawn): void {
    log.info("KO V3 handleTokenBidWithdrawn() called - tokenId {}", [event.params._tokenId.toString()]);

    createBidWithdrawnEvent(event, event.params._tokenId, event.params._bidder)
    clearTokenOffer(event.block, event.params._tokenId)

    let token = loadNonNullableToken(event.params._tokenId)
    token.openOffer = null
    token.currentTopBidder = null
    token.save();

    let edition = Edition.load(token.edition) as Edition

    recordDayBidWithdrawnCount(event)
    recordSecondaryBidWithdrawn(event, token, edition, event.params._bidder)
}

export function handleBuyNowTokenPriceChanged(event: BuyNowPriceChanged): void {
    log.info("KO V3 handleBuyNowTokenPriceChanged() called - tokenId {}", [event.params._id.toString()]);

    let token = loadNonNullableToken(event.params._id)
    token.listPrice = toEther(event.params._price)
    token.save()

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition);
    listedToken.listPrice = toEther(event.params._price)

    recordSecondaryTokenListingPriceChange(event, token, edition, event.params._price, Address.fromString(listedToken.lister));
    listedToken.save()
}

export function handleTokenListedForReserveAuction(event: ListedForReserveAuction): void {
    log.info("KO V3 handleEditionListedForReserveAuction() called - tokenId {}", [event.params._id.toString()]);

    let marketplace = KODAV3SecondaryMarketplace.bind(event.address)

    let token = loadNonNullableToken(event.params._id)
    token.isListed = true;
    token.salesType = SaleTypes.RESERVE_COUNTDOWN_AUCTION

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition)

    let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)
    let listingSeller = reserveAuction.value0

    listedToken.reserveAuctionSeller = reserveAuction.value0
    listedToken.reservePrice = event.params._reservePrice
    listedToken.reserveAuctionStartDate = event.params._startDate
    listedToken.listingTimestamp = event.block.timestamp
    listedToken.seriesNumber = event.params._id.minus(edition.editionNmber)

    let biggestTokenId: BigInt = edition.editionNmber.plus(edition.totalAvailable);
    let firstTokenId = edition.editionNmber.plus(ONE);
    listedToken.isFirstEdition = firstTokenId.equals(event.params._id)
    listedToken.isLastEdition = biggestTokenId.equals(event.params._id)
    listedToken.isGenesisEdition = edition.isGenesisEdition

    // Save the lister
    let collector = loadOrCreateCollector(listingSeller, event.block);
    collector.save();

    recordSecondaryTokenReserveAuctionListed(event, token, edition, event.params._reservePrice, listingSeller)

    token.save()
}

export function handleBidPlacedOnReserveAuction(event: BidPlacedOnReserveAuction): void {
    log.info("KO V3 handleBidPlacedOnReserveAuction() called - tokenId {}", [event.params._id.toString()]);

    let marketplace = KODAV3SecondaryMarketplace.bind(event.address)

    let token = loadNonNullableToken(event.params._id)
    token.isListed = true;
    token.salesType = SaleTypes.RESERVE_COUNTDOWN_AUCTION
    token.save()

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition)
    listedToken.reserveAuctionBidder = event.params._bidder
    listedToken.reserveAuctionBid = event.params._amount

    // Check if the bid has gone above or is equal to reserve price as this means that the countdown for auction end has started
    if (listedToken.reserveAuctionBid.ge(listedToken.reservePrice)) {
        let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)
        let bidEnd = reserveAuction.value5 // get the timestamp for the end of the reserve auction or when the bids end

        // these two values are the same until the point that someone bids near the end of the auction and the end of the auction is extended - sudden death
        listedToken.previousReserveAuctionEndTimestamp = listedToken.reserveAuctionEndTimestamp.equals(ZERO)
            ? bidEnd
            : listedToken.reserveAuctionEndTimestamp

        listedToken.reserveAuctionEndTimestamp = bidEnd

        recordSecondaryTokenReserveAuctionCountdownStarted(event, token, edition, event.params._amount, event.params._bidder, event.params._currentOwner)

        // when the two values above are not the same, auction has been extended
        if (listedToken.previousReserveAuctionEndTimestamp.notEqual(listedToken.reserveAuctionEndTimestamp)) {
            listedToken.reserveAuctionNumTimesExtended = listedToken.reserveAuctionNumTimesExtended.plus(ONE)
            listedToken.isReserveAuctionInSuddenDeath = true
            listedToken.reserveAuctionTotalExtensionLengthInSeconds = listedToken.reserveAuctionTotalExtensionLengthInSeconds.plus(
                listedToken.reserveAuctionEndTimestamp.minus(
                    listedToken.previousReserveAuctionEndTimestamp
                )
            )

            recordSecondaryTokenReserveAuctionExtended(event, token, edition, event.params._amount, event.params._bidder, event.params._currentOwner)
        }
    }

    listedToken.save()

    let id = event.block.timestamp.toString().concat(event.params._id.toHexString())

    let tokenOffer = new TokenOffer(id);
    tokenOffer.version = KodaVersions.KODA_V3
    tokenOffer.timestamp = event.block.timestamp;
    tokenOffer.edition = edition.id
    tokenOffer.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenOffer.ethValue = toEther(event.params._amount)
    tokenOffer.ownerAtTimeOfBid = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenOffer.token = token.id
    tokenOffer.save()

    token.openOffer = tokenOffer.id
    token.save();

    recordDayBidPlacedCount(event)
    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    recordTokenOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._id, ZERO)

    recordSecondaryTokenReserveAuctionBidPlaced(event, token, edition, event.params._amount, event.params._bidder, event.params._currentOwner)
}

export function handleReserveAuctionResulted(event: ReserveAuctionResulted): void {
    log.info("KO V3 handleReserveAuctionResulted() called - tokenId {}", [event.params._id.toString()]);

    let token = loadNonNullableToken(event.params._id)
    token.isListed = false
    token.salesType = OFFERS_ONLY
    token.save()

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition)
    listedToken.isReserveAuctionResulted = true
    listedToken.isReserveAuctionResultedDateTime = event.block.timestamp
    listedToken.reserveAuctionResulter = event.params._resulter

    // Create collector
    let collector = loadOrCreateCollector(event.params._winner, event.block);
    collector.save();

    createBidAcceptedEvent(event, event.params._id, event.params._currentOwner, event.params._winner, event.params._finalPrice)
    clearTokenOffer(event.block, event.params._id)

    // BidAccepted emit Transfer events - handle day counts for monetary values in here
    recordDayBidAcceptedCount(event)
    recordDayCounts(event, event.params._finalPrice)
    recordDayValue(event, event.params._id, event.params._finalPrice)
    recordDayTotalValueCycledInBids(event, event.params._finalPrice)
    recordDaySecondaryTotalValue(event, event.params._finalPrice)

    addSecondarySaleToSeller(event.block, event.params._currentOwner, event.params._finalPrice);
    addSecondaryPurchaseToCollector(event.block, event.params._winner, event.params._finalPrice);

    // FIXME only record artist royalties
    // recordArtistValue(edition.artistAccount, event.params._tokenId, event.params._amount)
    // recordArtistCounts(edition.artistAccount, event.params._amount)

    recordSecondaryBidAccepted(event, token, edition, event.params._finalPrice, event.params._winner, event.params._currentOwner)
}

export function handleBidWithdrawnFromReserveAuction(event: BidWithdrawnFromReserveAuction): void {
    log.info("KO V3 handleBidWithdrawnFromReserveAuction() called - tokenId {}", [event.params._id.toString()]);

    let token = loadNonNullableToken(event.params._id)
    token.openOffer = null
    token.currentTopBidder = null
    token.save();

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition)
    listedToken.reserveAuctionBidder = ZERO_ADDRESS
    listedToken.reserveAuctionBid = ZERO
    listedToken.save()

    createBidWithdrawnEvent(event, event.params._id, event.params._bidder)
    clearTokenOffer(event.block, event.params._id)

    recordDayBidWithdrawnCount(event)
    recordSecondaryBidWithdrawn(event, token, edition, event.params._bidder)
}

export function handleReservePriceUpdated(event: ReservePriceUpdated): void {
    log.info("KO V3 handleReservePriceUpdated() called - tokenId {}", [event.params._id.toString()]);

    let marketplace = KODAV3SecondaryMarketplace.bind(event.address)

    let token = loadNonNullableToken(event.params._id)
    token.isListed = true
    token.salesType = RESERVE_COUNTDOWN_AUCTION

    let edition = Edition.load(token.edition) as Edition
    let listedToken = loadOrCreateListedToken(event.params._id, edition)
    listedToken.reservePrice = event.params._reservePrice

    // Check if the current bid has gone above or is equal to reserve price as this means that the countdown for auction end has started
    if (listedToken.reserveAuctionBid.ge(event.params._reservePrice)) {
        let reserveAuction = marketplace.editionOrTokenWithReserveAuctions(event.params._id)
        let bidEnd = reserveAuction.value5 // get the timestamp for the end of the reserve auction or when the bids end

        // these two values are the same until the point that someone bids near the end of the auction and the end of the auction is extended - sudden death
        listedToken.previousReserveAuctionEndTimestamp = bidEnd
        listedToken.reserveAuctionEndTimestamp = bidEnd
    }

    listedToken.save()
    token.save()
}

export function handleEmergencyBidWithdrawFromReserveAuction(event: EmergencyBidWithdrawFromReserveAuction): void {
    log.info("KO V3 handleEmergencyBidWithdrawFromReserveAuction() called - tokenId {}", [event.params._id.toString()]);

    let token = loadNonNullableToken(event.params._id)
    token.isListed = false
    token.salesType = OFFERS_ONLY
    let edition = Edition.load(token.edition) as Edition
    let listedToken = loadOrCreateListedToken(event.params._id, edition)

    // Clear down all reserve auction fields
    _clearReserveAuctionFields(listedToken)

    token.save()
}


export function handleReserveAuctionConvertedToBuyItNow(event: ReserveAuctionConvertedToBuyItNow): void {
    log.info("KO V3 handleReserveAuctionConvertedToBuyItNow() called - tokenId {}", [event.params._id.toString()]);

    let marketplace = KODAV3SecondaryMarketplace.bind(event.address)
    let kodaV3Contract = KnownOriginV3.bind(marketplace.koda())

    let token = loadNonNullableToken(event.params._id)

    let edition = Edition.load(token.edition) as Edition

    token.isListed = true
    token.salesType = SaleTypes.BUY_NOW
    token.listPrice = toEther(event.params._listingPrice)

    let listedToken = loadOrCreateListedToken(event.params._id, edition)
    // TODO handle start date
    // listedToken.startDate = event.params._startDate
    listedToken.listPrice = toEther(event.params._listingPrice)

    _clearReserveAuctionFields(listedToken)

    token.save()
    listedToken.save()
}

export function handleReserveAuctionConvertedToOffers(event: ReserveAuctionConvertedToOffers): void {
    log.info("KO V3 handleReserveAuctionConvertedToOffers() called - tokenId {}", [event.params._tokenId.toString()]);

    let token = loadNonNullableToken(event.params._tokenId)

    let edition = Edition.load(token.edition) as Edition

    token.isListed = false
    token.salesType = SaleTypes.OFFERS_ONLY
    token.listPrice = ZERO_BIG_DECIMAL

    let listedToken = loadOrCreateListedToken(event.params._tokenId, edition)
    listedToken.listPrice = ZERO_BIG_DECIMAL

    _clearReserveAuctionFields(listedToken)

    token.save()
    listedToken.save()
}

function _clearReserveAuctionFields(listedToken: ListedToken): void {
    listedToken.reserveAuctionBidder = ZERO_ADDRESS
    listedToken.reserveAuctionBid = ZERO
    listedToken.isReserveAuctionResulted = false
    listedToken.isReserveAuctionResultedDateTime = ZERO
    listedToken.reserveAuctionSeller = ZERO_ADDRESS
    listedToken.reservePrice = ZERO
    listedToken.reserveAuctionResulter = ZERO_ADDRESS
    listedToken.reserveAuctionBid = ZERO
    listedToken.reserveAuctionStartDate = ZERO
    listedToken.previousReserveAuctionEndTimestamp = ZERO
    listedToken.reserveAuctionEndTimestamp = ZERO
    listedToken.reserveAuctionNumTimesExtended = ZERO
    listedToken.isReserveAuctionInSuddenDeath = false
    listedToken.reserveAuctionTotalExtensionLengthInSeconds = ZERO
    listedToken.reserveAuctionCanEmergencyExit = false
}
