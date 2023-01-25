import {Address} from "@graphprotocol/graph-ts";
import {BigInt, log, store} from "@graphprotocol/graph-ts/index";

import {
    AuctionDisabled,
    AuctionEnabled,
    BidAccepted,
    BidPlaced,
    BidRejected,
    BidWithdrawn
} from "../../../generated/TokenMarketplace/TokenMarketplace";

import {TokenOffer} from "../../../generated/schema";

import {toEther} from "../../utils/utils";

import {getKnownOriginV2ForAddress} from "./KODAV2AddressLookup";

import {TokenDeListed, TokenListed, TokenPurchased} from "../../../generated/TokenMarketplaceV2/TokenMarketplaceV2";
import {ONE, ZERO, ZERO_BIG_DECIMAL} from "../../utils/constants";

import * as KodaVersions from "../../utils/KodaVersions";
import * as SaleTypes from "../../utils/SaleTypes";

import * as editionService from "../../services/Edition.service";
import * as tokenEventFactory from "../../services/TokenEvent.factory";
import * as collectorService from "../../services/Collector.service";
import * as listedTokenService from "../../services/ListedToken.service";
import * as tokenService from "../../services/Token.service";
import * as dayService from "../../services/Day.service";
import * as offerService from "../../services/Offers.service";
import * as activityEventService from "../../services/ActivityEvent.service";
import * as artistService from "../../services/Artist.service";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    /*
      event AuctionEnabled(
        uint256 indexed _tokenId,
        address indexed _auctioneer
      );
    */
    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
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

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.listing = null
    tokenEntity.save();

    offerService.clearTokenOffer(event.block, event.params._tokenId)
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

    tokenEventFactory.createBidPlacedEvent(event, event.params._tokenId.toString(), event.params._currentOwner, event.params._bidder, event.params._amount)

    let timestamp = event.block.timestamp
    let id = timestamp.toString().concat(event.params._tokenId.toHexString())

    let tokenOffer = new TokenOffer(id);
    tokenOffer.version = KodaVersions.KODA_V2

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.currentTopBidder = event.params._bidder
    tokenEntity.save()

    let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract);
    editionEntity.save()

    tokenOffer.timestamp = timestamp;
    tokenOffer.edition = editionEntity.id
    tokenOffer.bidder = collectorService.loadOrCreateCollector(event.params._bidder, event.block).id
    tokenOffer.ethValue = toEther(event.params._amount)
    tokenOffer.ownerAtTimeOfBid = collectorService.loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenOffer.token = tokenEntity.id
    tokenOffer.save()

    tokenEntity.openOffer = tokenOffer.id
    tokenEntity.save();

    dayService.recordDayBidPlacedCount(event)
    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)
    dayService.recordDayTotalValuePlaceInBids(event, event.params._amount)

    offerService.recordTokenOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._tokenId, null);

    activityEventService.recordSecondaryBidPlaced(event, tokenEntity, editionEntity, event.params._amount, event.params._bidder)
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

    tokenEventFactory.createBidAcceptedEvent(event, event.params._tokenId.toString(), event.params._currentOwner, event.params._bidder, event.params._amount)
    offerService.clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.listing = null
    tokenEntity.currentOwner = collectorService.loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, event.params._amount, false)
    tokenEntity.save();

    // Save the collector
    let collector = collectorService.loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

    // Edition updates
    let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract)

    // Tally up primary sale owners
    if (!collectorService.collectorInList(collector, editionEntity.primaryOwners)) {
        let primaryOwners = editionEntity.primaryOwners;
        primaryOwners.push(collector.id);
        editionEntity.primaryOwners = primaryOwners;
    }

    // BidAccepted emit Transfer events - handle day counts for monetary values in here
    dayService.recordDayBidAcceptedCount(event)
    dayService.recordDayCounts(event, event.params._amount)
    dayService.recordDayValue(event, event.params._tokenId, event.params._amount)
    dayService.recordDayTotalValueCycledInBids(event, event.params._amount)
    dayService.recordDaySecondaryTotalValue(event, event.params._amount)

    collectorService.addSecondarySaleToSeller(event.block, event.params._currentOwner, event.params._amount);
    collectorService.addSecondaryPurchaseToCollector(event.block, event.params._bidder, event.params._amount);

    artistService.handleKodaV2CommissionSplit(contract, editionEntity.editionNmber, event.params._tokenId, event.params._amount, false)

    editionEntity.save();

    activityEventService.recordSecondaryBidAccepted(event, tokenEntity, editionEntity, event.params._amount, event.params._bidder, event.params._currentOwner)
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

    tokenEventFactory.createBidRejectedEvent(event, event.params._tokenId.toString(), event.params._currentOwner, event.params._bidder, event.params._amount)
    offerService.clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract)
    editionEntity.save();

    dayService.recordDayBidRejectedCount(event)

    activityEventService.recordSecondaryBidRejected(event, tokenEntity, editionEntity, event.params._amount, event.params._bidder)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidWithdrawn(
        uint256 indexed _tokenId,
        address indexed _bidder
      );
    */
    tokenEventFactory.createBidWithdrawnEvent(event, event.params._tokenId.toString(), event.params._bidder)
    offerService.clearTokenOffer(event.block, event.params._tokenId)

    let contract = getKnownOriginV2ForAddress(event.address)
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract)
    editionEntity.save();

    dayService.recordDayBidWithdrawnCount(event)

    activityEventService.recordSecondaryBidWithdrawn(event, tokenEntity, editionEntity, event.params._bidder)
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
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY
    tokenEntity.currentOwner = collectorService.loadOrCreateCollector(event.params._buyer, event.block).id
    tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, event.params._price, false)

    // listing info
    tokenEntity.listPrice = ZERO_BIG_DECIMAL
    tokenEntity.lister = null
    tokenEntity.listing = null
    tokenEntity.listingTimestamp = ZERO

    // Remove token listing from store
    store.remove("ListedToken", event.params._tokenId.toString());

    // counts and offers
    offerService.clearTokenOffer(event.block, event.params._tokenId)
    dayService.recordDayCounts(event, event.params._price)
    dayService.recordDayValue(event, event.params._tokenId, event.params._price)

    // Save the collector
    let buyer = collectorService.loadOrCreateCollector(event.params._buyer, event.block);
    buyer.save();

    // Save the seller
    let seller = collectorService.loadOrCreateCollector(event.params._seller, event.block);
    seller.save();

    // Edition updates
    let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract)

    activityEventService.recordSecondarySale(event, tokenEntity, editionEntity, event.params._price, event.params._buyer, event.params._seller)
    tokenEventFactory.createTokenSecondaryPurchaseEvent(event, event.params._tokenId.toString(), event.params._buyer, event.params._seller, event.params._price)

    tokenEntity.save()

    // Transfer events handled somewhere else
    collectorService.addSecondarySaleToSeller(event.block, event.params._seller, event.params._price);
    collectorService.addSecondaryPurchaseToCollector(event.block, event.params._buyer, event.params._price);
    dayService.recordDaySecondaryTotalValue(event, event.params._price)

    artistService.handleKodaV2CommissionSplit(contract, editionEntity.editionNmber, event.params._tokenId, event.params._price, false)
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
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.isListed = true;
    tokenEntity.salesType = SaleTypes.BUY_NOW
    tokenEntity.listPrice = toEther(event.params._price)
    tokenEntity.lister = collectorService.loadOrCreateCollector(event.params._seller, event.block).id
    tokenEntity.listingTimestamp = event.block.timestamp
    tokenEntity.save()

    let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract)

    // Add ListedToken to store
    let listedToken = listedTokenService.loadOrCreateListedToken(event.params._tokenId.toString(), editionEntity);
    listedToken.listPrice = toEther(event.params._price)
    listedToken.lister = collectorService.loadOrCreateCollector(event.params._seller, event.block).id
    listedToken.listingTimestamp = event.block.timestamp
    listedToken.revokedApproval = !contract.isApprovedForAll(event.params._seller, event.address)

    // Add filter flags
    let biggestTokenId: BigInt = BigInt.fromString(editionEntity.editionNmber).plus(editionEntity.totalAvailable);
    let firstTokenId = BigInt.fromString(editionEntity.editionNmber).plus(ONE);

    listedToken.seriesNumber = event.params._tokenId.minus(BigInt.fromString(editionEntity.editionNmber))
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

    // Set the listing on the token
    tokenEntity.listing = listedToken.id.toString()
    tokenEntity.save()

    // Save the lister
    let collector = collectorService.loadOrCreateCollector(event.params._seller, event.block);
    collector.save();

    activityEventService.recordSecondaryTokenListed(event, tokenEntity, editionEntity, event.params._price, event.params._seller)
    tokenEntity.save()
}

export function handleTokenDeListed(event: TokenDeListed): void {
    /*
      event TokenDeListed(
        uint256 indexed _tokenId
      );
     */
    let contract = getKnownOriginV2ForAddress(event.address)
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY
    tokenEntity.listPrice = ZERO_BIG_DECIMAL
    tokenEntity.lister = null
    tokenEntity.listing = null
    tokenEntity.listingTimestamp = ZERO

    // Remove ListedToken from store
    store.remove("ListedToken", event.params._tokenId.toString());

    // if value is found this means a buy has happened so we dont want to include an extra event in the histories
    if (event.transaction.value === ZERO) {
        let editionEntity = editionService.loadOrCreateV2Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, contract)
        activityEventService.recordSecondaryTokenDeListed(event, tokenEntity, Address.fromString(tokenEntity.currentOwner), editionEntity)
    }

    tokenEntity.save()
}
