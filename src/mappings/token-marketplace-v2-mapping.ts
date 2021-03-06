import {Address} from "@graphprotocol/graph-ts";
import {
    BidAccepted,
    BidPlaced,
    BidRejected,
    BidWithdrawn,
    AuctionDisabled,
    AuctionEnabled
} from "../../generated/TokenMarketplace/TokenMarketplace";

import {
    TokenOffer
} from "../../generated/schema";

import {
    loadOrCreateV2Edition
} from "../services/Edition.service";

import {
    createBidAcceptedEvent,
    createBidPlacedEvent,
    createBidRejectedEvent,
    createBidWithdrawnEvent
} from "../services/TokenEvent.factory";

import {
    toEther
} from "../utils/utils";

import {
    addSecondaryPurchaseToCollector,
    addSecondarySaleToSeller,
    collectorInList,
    loadOrCreateCollector
} from "../services/Collector.service";

import {loadOrCreateV2Token} from "../services/Token.service";
import {loadOrCreateListedToken} from "../services/ListedToken.service";
import {getKnownOriginV2ForAddress} from "../utils/KODAV2AddressLookup";
import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidRejectedCount,
    recordDayBidWithdrawnCount,
    recordDayCounts,
    recordDaySecondaryTotalValue,
    recordDayTotalValueCycledInBids,
    recordDayTotalValuePlaceInBids,
    recordDayValue
} from "../services/Day.service";
import {clearTokenOffer, recordTokenOffer} from "../services/Offers.service";

import {
    recordSecondaryBidAccepted,
    recordSecondaryBidPlaced,
    recordSecondaryBidRejected,
    recordSecondaryBidWithdrawn,
    recordSecondarySale,
    recordSecondaryTokenDeListed,
    recordSecondaryTokenListed
} from "../services/ActivityEvent.service";

import {TokenDeListed, TokenListed, TokenPurchased} from "../../generated/TokenMarketplaceV2/TokenMarketplaceV2";
import {ONE, ZERO, ZERO_BIG_DECIMAL} from "../utils/constants";

import {BigInt, log, store} from "@graphprotocol/graph-ts/index";
import * as KodaVersions from "../utils/KodaVersions";
import * as SaleTypes from "../utils/SaleTypes";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    /*
      event AuctionEnabled(
        uint256 indexed _tokenId,
        address indexed _auctioneer
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.save();
}

export function handleAuctionDisabled(event: AuctionDisabled): void {
    /*
      event AuctionDisabled(
        uint256 indexed _tokenId,
        address indexed _auctioneer
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    clearTokenOffer(event.block, event.params._tokenId)
}

export function handleBidPlaced(event: BidPlaced): void {
    /*
      event BidPlaced(
        uint256 indexed _tokenId,
        address indexed _currentOwner,
        address indexed _bidder,
        uint256 _amount
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)

    createBidPlacedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)

    let timestamp = event.block.timestamp
    let id = timestamp.toString().concat(event.params._tokenId.toHexString())

    let tokenOffer = new TokenOffer(id);
    tokenOffer.version = KodaVersions.KODA_V2

    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.currentTopBidder = event.params._bidder
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenOffer.timestamp = timestamp;
    tokenOffer.edition = editionEntity.id
    tokenOffer.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenOffer.ethValue = toEther(event.params._amount)
    tokenOffer.ownerAtTimeOfBid = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenOffer.token = tokenEntity.id
    tokenOffer.save()

    tokenEntity.openOffer = tokenOffer.id
    tokenEntity.save();

    recordDayBidPlacedCount(event)
    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    recordTokenOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._tokenId, KodaVersions.MARKETPLACE_V2);

    recordSecondaryBidPlaced(event, tokenEntity, editionEntity, event.params._amount, event.params._bidder)
}

export function handleBidAccepted(event: BidAccepted): void {
    /*
      event BidAccepted(
        uint256 indexed _tokenId,
        address indexed _currentOwner,
        address indexed _bidder,
        uint256 _amount
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)

    createBidAcceptedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)
    clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.currentOwner = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEntity.lastSalePriceInEth = toEther(event.params._amount)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(event.params._amount))
    tokenEntity.save();

    // Save the collector
    let collector = loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

    // Edition updates
    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)

    // Tally up primary sale owners
    if (!collectorInList(collector, editionEntity.primaryOwners)) {
        let primaryOwners = editionEntity.primaryOwners;
        primaryOwners.push(collector.id);
        editionEntity.primaryOwners = primaryOwners;
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
    // recordArtistValue(editionEntity.artistAccount, event.params._tokenId, event.params._amount)
    // recordArtistCounts(editionEntity.artistAccount, event.params._amount)

    editionEntity.save();

    recordSecondaryBidAccepted(event, tokenEntity, editionEntity, event.params._amount, event.params._bidder, event.params._currentOwner)
}

export function handleBidRejected(event: BidRejected): void {
    /*
      event BidRejected(
        uint256 indexed _tokenId,
        address indexed _currentOwner,
        address indexed _bidder,
        uint256 _amount
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)

    createBidRejectedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)
    clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)
    editionEntity.save();

    recordDayBidRejectedCount(event)

    recordSecondaryBidRejected(event, tokenEntity, editionEntity, event.params._amount, event.params._bidder)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidWithdrawn(
        uint256 indexed _tokenId,
        address indexed _bidder
      );
    */
    createBidWithdrawnEvent(event, event.params._tokenId, event.params._bidder)
    clearTokenOffer(event.block, event.params._tokenId)

    let contract = getKnownOriginV2ForAddress(event.address)
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)
    editionEntity.save();

    recordDayBidWithdrawnCount(event)

    recordSecondaryBidWithdrawn(event, tokenEntity, editionEntity, event.params._bidder)
}

export function handleTokenPurchased(event: TokenPurchased): void {
    /*
      event TokenPurchased(
        uint256 indexed _tokenId,
        address indexed _buyer,
        address indexed _seller,
        uint256 _price
      );
     */
    let contract = getKnownOriginV2ForAddress(event.address)
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY
    tokenEntity.currentOwner = loadOrCreateCollector(event.params._buyer, event.block).id
    tokenEntity.lastSalePriceInEth = toEther(event.params._price)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(event.params._price))
    tokenEntity.listPrice = ZERO_BIG_DECIMAL
    tokenEntity.lister = null
    tokenEntity.listingTimestamp = ZERO

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
    let seller = loadOrCreateCollector(event.params._seller, event.block);
    seller.save();

    // Edition updates
    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)

    recordSecondarySale(event, tokenEntity, editionEntity, event.params._price, event.params._buyer, event.params._seller)

    tokenEntity.save()

    // Transfer events handled somewhere else
    addSecondarySaleToSeller(event.block, event.params._seller, event.params._price);
    addSecondaryPurchaseToCollector(event.block, event.params._buyer, event.params._price);
    recordDaySecondaryTotalValue(event, event.params._price)

    // FIXME record artist royalties
}


export function handleTokenListed(event: TokenListed): void {
    /*
     event TokenListed(
        uint256 indexed _tokenId,
        address indexed _seller,
        uint256 _price
      );
     */

    let contract = getKnownOriginV2ForAddress(event.address)
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.isListed = true;
    tokenEntity.salesType = SaleTypes.BUY_NOW
    tokenEntity.listPrice = toEther(event.params._price)
    tokenEntity.lister = loadOrCreateCollector(event.params._seller, event.block).id
    tokenEntity.listingTimestamp = event.block.timestamp
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)

    // Add ListedToken to store
    let listedToken = loadOrCreateListedToken(event.params._tokenId, editionEntity);
    listedToken.listPrice = toEther(event.params._price)
    listedToken.lister = loadOrCreateCollector(event.params._seller, event.block).id
    listedToken.listingTimestamp = event.block.timestamp

    // Add filter flags
    let biggestTokenId: BigInt = editionEntity.editionNmber.plus(editionEntity.totalAvailable);
    let firstTokenId = editionEntity.editionNmber.plus(ONE);

    listedToken.seriesNumber = event.params._tokenId.minus(editionEntity.editionNmber)
    listedToken.isFirstEdition = firstTokenId.equals(event.params._tokenId)
    listedToken.isLastEdition = biggestTokenId.equals(event.params._tokenId)
    listedToken.isGenesisEdition = editionEntity.isGenesisEdition
    log.info("Token ID={} | biggestTokenId={} | seriesNumber={} | editionSize={} | totalIssued={} ", [
        event.params._tokenId.toString(),
        biggestTokenId.toString(),
        listedToken.seriesNumber.toString(),
        editionEntity.totalAvailable.toString(),
        editionEntity.totalSupply.toString()
    ]);
    listedToken.save();

    // Save the lister
    let collector = loadOrCreateCollector(event.params._seller, event.block);
    collector.save();

    recordSecondaryTokenListed(event, tokenEntity, editionEntity, event.params._price, event.params._seller)
    tokenEntity.save()
}

export function handleTokenDeListed(event: TokenDeListed): void {
    /*
      event TokenDeListed(
        uint256 indexed _tokenId
      );
     */
    let contract = getKnownOriginV2ForAddress(event.address)
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY
    tokenEntity.listPrice = ZERO_BIG_DECIMAL
    tokenEntity.lister = null
    tokenEntity.listingTimestamp = ZERO

    // Remove ListedToken from store
    store.remove("ListedToken", event.params._tokenId.toString());

    // if value is found this means a buy has happened so we dont want to include an extra event in the histories
    if (event.transaction.value === ZERO) {
        let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)
        recordSecondaryTokenDeListed(event, tokenEntity, Address.fromString(tokenEntity.currentOwner), editionEntity)
    }

    tokenEntity.save()
}
