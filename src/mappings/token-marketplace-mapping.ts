import {
    BidAccepted,
    BidPlaced,
    BidRejected,
    BidWithdrawn,
    AuctionDisabled,
    AuctionEnabled
} from "../../generated/TokenMarketplace/TokenMarketplace";

import {Address} from "@graphprotocol/graph-ts/index";

import {TokenOffer} from "../../generated/schema";

import * as KodaVersions from "../utils/KodaVersions";

import {ONE} from "../utils/constants";
import {toEther} from "../utils/utils";

import {getKnownOriginV2ForAddress} from "../utils/KODAV2AddressLookup";

import * as editionService from "../services/Edition.service";
import * as tokenService from "../services/Token.service";
import * as tokenEventFactory from "../services/TokenEvent.factory";
import * as collectorService from "../services/Collector.service";
import * as dayService from "../services/Day.service";
import * as offerService from "../services/Offers.service";
import * as activityEventService from "../services/ActivityEvent.service";
import * as artistService from "../services/Artist.service";

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

    tokenEventFactory.createBidPlacedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)

    let timestamp = event.block.timestamp
    let id = timestamp.toString().concat(event.params._tokenId.toHexString())

    let tokenOffer = new TokenOffer(id);
    tokenOffer.version = KodaVersions.KODA_V2

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.currentTopBidder = event.params._bidder
    tokenEntity.save()

    let editionEntity = editionService.loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
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

    tokenEventFactory.createBidAcceptedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)

    offerService.clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.currentOwner = collectorService.loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEntity.lastSalePriceInEth = toEther(event.params._amount)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(event.params._amount))
    if(tokenEntity.largestSalePriceEth < tokenEntity.lastSalePriceInEth){
        tokenEntity.largestSalePriceEth = tokenEntity.lastSalePriceInEth
    }
    if(tokenEntity.largestSecondaryValueInEth < tokenEntity.lastSalePriceInEth){
        tokenEntity.largestSecondaryValueInEth = tokenEntity.lastSalePriceInEth
    }
    tokenEntity.save();

    // Save the collector
    let collector = collectorService.loadOrCreateCollector(event.params._bidder, event.block);
    collector.save();

    // Edition updates
    let editionEntity = editionService.loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)

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

    tokenEventFactory.createBidRejectedEvent(event, event.params._tokenId, event.params._currentOwner, event.params._bidder, event.params._amount)
    offerService.clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = editionService.loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)
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
    let contract = getKnownOriginV2ForAddress(event.address)

    tokenEventFactory.createBidWithdrawnEvent(event, event.params._tokenId, event.params._bidder)
    offerService.clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = editionService.loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)
    editionEntity.save();

    dayService.recordDayBidWithdrawnCount(event)

    activityEventService.recordSecondaryBidWithdrawn(event, tokenEntity, editionEntity, event.params._bidder)
}
