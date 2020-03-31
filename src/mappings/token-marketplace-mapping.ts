import {
    Address,
} from "@graphprotocol/graph-ts/index";

import {
    BidAccepted,
    BidPlaced,
    BidRejected,
    BidWithdrawn,
    AuctionDisabled,
    AuctionEnabled
} from "../../generated/TokenMarketplace/TokenMarketplace";

import {
    KnownOrigin
} from "../../generated/KnownOrigin/KnownOrigin"

import {
    TokenOffer, TokenEvent
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


export function handleAuctionEnabled(event: AuctionEnabled): void {
    /*
      event AuctionEnabled(
        uint256 indexed _tokenId,
        address indexed _auctioneer
      );
    */
    let contract = getKnownOriginForAddress(event.address)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    tokenEntity.openOffer = null;
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

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    tokenEntity.openOffer = null;
    tokenEntity.save();
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

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenOffer.timestamp = timestamp;
    tokenOffer.edition = editionEntity.id
    tokenOffer.bidder = event.params._bidder
    tokenOffer.ethValue = toEther(event.params._amount)
    tokenOffer.ownerAtTimeOfBid = event.params._currentOwner
    tokenOffer.token = tokenEntity.id;
    tokenOffer.save()

    tokenEntity.openOffer = tokenOffer.id
    tokenEntity.save();

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

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    tokenEntity.openOffer = null;
    tokenEntity.save();


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

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    tokenEntity.openOffer = null;
    tokenEntity.save();

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

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    tokenEntity.openOffer = null;
    tokenEntity.save();

}
