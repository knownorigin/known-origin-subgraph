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
    collectorInList,
    loadOrCreateCollector
} from "../../services/Collector.service";
import {Edition, TokenOffer} from "../../../generated/schema";
import {loadOrCreateListedToken} from "../../services/ListedToken.service";
import {ONE, ZERO, ZERO_BIG_DECIMAL} from "../../utils/constants";
import {
    recordSecondaryBidAccepted,
    recordSecondaryBidPlaced,
    recordSecondaryBidRejected,
    recordSecondaryBidWithdrawn,
    recordSecondarySale,
    recordSecondaryTokenDeListed,
    recordSecondaryTokenListed,
    recordSecondaryTokenListingPriceChange,
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
    createBidWithdrawnEvent
} from "../../services/TokenEvent.factory";
import * as KodaVersions from "../../utils/KodaVersions";
import * as SaleTypes from "../../utils/SaleTypes";

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
    log.info("KO V3 handleTokenListed() called - _tokenId {}", [event.params._id.toString()]);

    // let marketplace = KODAV3SecondaryMarketplace.bind(event.address)
    // let koContract = KnownOriginV3.bind(marketplace.koda())

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
    log.info("KO V3 handleTokenDeListed() called - _tokenId {}", [event.params._tokenId.toString()]);
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
    log.info("KO V3 handleTokenPurchased() called - _tokenId {}", [event.params._tokenId.toString()]);

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

    // Edition updates
    recordSecondarySale(event, token, edition, event.params._price, event.params._buyer, listingSeller)

    token.save()
}

export function handleTokenBidPlaced(event: TokenBidPlaced): void {
    log.info("KO V3 handleTokenBidPlaced() called - _tokenId {}", [event.params._tokenId.toString()]);

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

    recordTokenOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._tokenId, KodaVersions.MARKETPLACE_V3);

    recordSecondaryBidPlaced(event, token, edition, event.params._amount, event.params._bidder)
}

export function handleTokenBidAccepted(event: TokenBidAccepted): void {
    log.info("KO V3 handleTokenBidAccepted() called - _tokenId {}", [event.params._tokenId.toString()]);

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

    // Edition updates
    let edition = Edition.load(token.edition) as Edition

    // Tally up primary sale owners
    if (!collectorInList(collector, edition.primaryOwners)) {
        let primaryOwners = edition.primaryOwners;
        primaryOwners.push(collector.id);
        edition.primaryOwners = primaryOwners;
    }

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

    edition.save();

    recordSecondaryBidAccepted(event, token, edition, event.params._amount, event.params._bidder, event.params._currentOwner)
}

export function handleTokenBidRejected(event: TokenBidRejected): void {
    log.info("KO V3 handleTokenBidRejected() called - _tokenId {}", [event.params._tokenId.toString()]);

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
    log.info("KO V3 handleTokenBidWithdrawn() called - _tokenId {}", [event.params._tokenId.toString()]);

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
    log.info("KO V3 handleBuyNowTokenPriceChanged() called - tokenID {}", [event.params._id.toString()]);

    let token = loadNonNullableToken(event.params._id)
    token.listPrice = toEther(event.params._price)
    token.save()

    let edition = Edition.load(token.edition) as Edition

    let listedToken = loadOrCreateListedToken(event.params._id, edition);
    listedToken.listPrice = toEther(event.params._price)

    recordSecondaryTokenListingPriceChange(event, token, edition, event.params._price, Address.fromString(listedToken.lister));
    listedToken.save()
}
