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
import * as KodaVersions from "../utils/KodaVersions";

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
    addPrimarySaleToCollector,
    addSecondaryPurchaseToCollector,
    addSecondarySaleToSeller,
    collectorInList,
    loadOrCreateCollector
} from "../services/Collector.service";

import {loadOrCreateV2Token} from "../services/Token.service";
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
    recordSecondaryBidWithdrawn
} from "../services/ActivityEvent.service";
import {ONE} from "../utils/constants";

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

    recordTokenOffer(event.block, event.transaction, event.params._bidder, event.params._amount, event.params._tokenId, null);

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
    let contract = getKnownOriginV2ForAddress(event.address)

    createBidWithdrawnEvent(event, event.params._tokenId, event.params._bidder)
    clearTokenOffer(event.block, event.params._tokenId)

    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract)
    editionEntity.save();

    recordDayBidWithdrawnCount(event)

    recordSecondaryBidWithdrawn(event, tokenEntity, editionEntity, event.params._bidder)
}
