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
    loadOrCreateEdition
} from "../services/Edition.service";

import {
    createBidAcceptedEvent,
    createBidPlacedEvent,
    createBidRejectedEvent,
    createBidWithdrawnEvent
} from "../services/TokenEvent.factory";

import {
    toEther
} from "../utils";

import {
    addPrimarySaleToCollector,
    collectorInList,
    loadOrCreateCollector
} from "../services/Collector.service";

import {getArtistAddress} from "../services/AddressMapping.service";
import {loadOrCreateToken} from "../services/Token.service";
import {getKnownOriginForAddress} from "../services/KnownOrigin.factory";
import {
    recordDayBidAcceptedCount,
    recordDayBidPlacedCount,
    recordDayBidRejectedCount,
    recordDayBidWithdrawnCount,
    recordDayCounts,
    recordDayTotalValueCycledInBids,
    recordDayTotalValuePlaceInBids,
    recordDayValue
} from "../services/Day.service";
import {clearTokenOffer, recordTokenOffer} from "../services/Offers.service";


export function handleAuctionEnabled(event: AuctionEnabled): void {
    /*
      event AuctionEnabled(
        uint256 indexed _tokenId,
        address indexed _auctioneer
      );
    */
    let contract = getKnownOriginForAddress(event.address)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.save();
}

export function handleAuctionDisabled(event: AuctionDisabled): void {
    /*
      event AuctionDisabled(
        uint256 indexed _tokenId,
        address indexed _auctioneer
      );
    */
    let contract = getKnownOriginForAddress(event.address)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    clearTokenOffer(event.block, contract, event.params._tokenId)
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
    let contract = getKnownOriginForAddress(event.address)

    createBidPlacedEvent(event)

    let timestamp = event.block.timestamp
    let id = timestamp.toString().concat(event.params._tokenId.toHexString())

    let tokenOffer = new TokenOffer(id);

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.currentTopBidder = event.params._bidder
    tokenEntity.save()

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
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

    recordTokenOffer(event.block, event.transaction, contract, event.params._bidder, event.params._amount, event.params._tokenId)
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
    let contract = getKnownOriginForAddress(event.address)

    createBidAcceptedEvent(event)
    clearTokenOffer(event.block, contract, event.params._tokenId)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    recordDayBidAcceptedCount(event)
    recordDayCounts(event, event.params._amount)
    recordDayValue(event, event.params._tokenId, event.params._amount)
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
    let contract = getKnownOriginForAddress(event.address)

    createBidRejectedEvent(event)
    clearTokenOffer(event.block, contract, event.params._tokenId)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    recordDayBidRejectedCount(event)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    /*
      event BidWithdrawn(
        uint256 indexed _tokenId,
        address indexed _bidder
      );
    */
    let contract = getKnownOriginForAddress(event.address)

    createBidWithdrawnEvent(event)
    clearTokenOffer(event.block, contract, event.params._tokenId)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save();

    recordDayBidWithdrawnCount(event)
}
