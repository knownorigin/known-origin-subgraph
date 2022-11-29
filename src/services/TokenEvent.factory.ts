import {Address, ethereum} from "@graphprotocol/graph-ts/index";
import {Token, TokenEvent} from "../../generated/schema";
import {ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";
import {toEther} from "../utils/utils";
import {loadNonNullableEdition, loadNonNullableEditionById} from "./Edition.service";
import {loadNonNullableToken} from "./Token.service";
import {getKnownOriginV2ForAddress} from "../utils/KODAV2AddressLookup";
import {getArtistAddress} from "./AddressMapping.service";
import {loadOrCreateCollector} from "./Collector.service";
import {BigInt, log} from "@graphprotocol/graph-ts";

import * as EVENT_TYPES from "../utils/EventTypes";

function generateTokenEventId(name: String, tokenEntity: Token, from: Address, timestamp: BigInt): string {
    return name
        .concat("-")
        .concat(tokenEntity.id)
        .concat("-")
        .concat(tokenEntity.version.toString())
        .concat("-")
        .concat(from.toHexString())
        .concat("-")
        .concat(timestamp.toString());
}

function populateEventData(event: ethereum.Event, tokenEntity: Token, from: Address, to: Address): TokenEvent {
    let timestamp = event.block.timestamp;
    let tokenEventId = generateTokenEventId(EVENT_TYPES.TRANSFER, tokenEntity, from, timestamp);
    log.warning("^^^^^^ TOKEN EVENT ID : {}", [tokenEventId])

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = tokenEntity.version

    // Show birth if first transfer
    tokenEvent.name = from.equals(ZERO_ADDRESS) ? EVENT_TYPES.BIRTH : EVENT_TYPES.TRANSFER;
    tokenEvent.bidder = loadOrCreateCollector(to, event.block).id
    tokenEvent.ethValue = ZERO_BIG_DECIMAL
    tokenEvent.currentOwner = loadOrCreateCollector(from, event.block).id

    populateEventDetails(event, tokenEvent)

    return tokenEvent
}

///////////////
// Transfers //
///////////////

export function createTokenTransferEvent(event: ethereum.Event, tokenId: string, from: Address, to: Address): TokenEvent {
    // Save the token
    let tokenEntity = loadNonNullableToken(tokenId);
    log.warning("******* TOKEN VERSION : id: {}  version : {} ", [tokenId, tokenEntity.version.toString()])

    // Populate data
    let tokenEvent = populateEventData(event, tokenEntity, from, to);
    tokenEvent.edition = tokenEntity.edition;
    tokenEvent.token = tokenEntity.id;

    if (tokenEntity.version.toString() === "4") {
        log.warning("GETS PAST POPULATE EVENT DATA id: {} ", [tokenEvent.id])
    }

    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEvent.save()

    tokenEntity.save()

    return tokenEvent
}

///////////////////////
// Purchasing & Bids //
///////////////////////

export function createTokenPrimaryPurchaseEvent(event: ethereum.Event, tokenId: string, buyer: Address, priceInWei: BigInt): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEntity = loadNonNullableToken(tokenId);

    let tokenEventId = generateTokenEventId(EVENT_TYPES.PURCHASE, tokenEntity, buyer, timestamp);

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = tokenEntity.version;

    // Setup token and add history
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadNonNullableEditionById(tokenEntity.edition);
    editionEntity.save();

    tokenEvent.name = EVENT_TYPES.PURCHASE;
    tokenEvent.version = editionEntity.version
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.buyer = loadOrCreateCollector(buyer, event.block).id
    tokenEvent.ethValue = priceInWei.toBigDecimal()
    tokenEvent.currentOwner = loadOrCreateCollector(getArtistAddress(Address.fromString(editionEntity.artistAccount.toHexString())), event.block).id

    populateEventDetails(event, tokenEvent)

    tokenEvent.save()

    return tokenEvent
}

export function createTokenSecondaryPurchaseEvent(event: ethereum.Event, tokenId: string, buyer: Address, seller: Address, priceInWei: BigInt): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEntity = loadNonNullableToken(tokenId)

    let tokenEventId = generateTokenEventId(EVENT_TYPES.PURCHASE, tokenEntity, buyer, timestamp);

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = tokenEntity.version

    // Setup token and add history
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadNonNullableEdition(tokenEntity.editionNumber);
    editionEntity.save()

    tokenEvent.name = EVENT_TYPES.PURCHASE;
    tokenEvent.version = editionEntity.version
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.buyer = loadOrCreateCollector(buyer, event.block).id
    tokenEvent.ethValue = priceInWei.toBigDecimal()
    tokenEvent.currentOwner = loadOrCreateCollector(seller, event.block).id

    populateEventDetails(event, tokenEvent)

    tokenEvent.save()

    return tokenEvent
}

export function createBidPlacedEvent(
    event: ethereum.Event, tokenId: string, currentOwner: Address, bidder: Address, priceInWei: BigInt
): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEntity = loadNonNullableToken(tokenId)

    let tokenEventId = generateTokenEventId(EVENT_TYPES.BID_PLACED, tokenEntity, bidder, timestamp);

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadNonNullableEdition(tokenEntity.editionNumber);
    editionEntity.save()

    tokenEvent.name = EVENT_TYPES.BID_PLACED
    tokenEvent.version = tokenEntity.version
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(priceInWei)
    tokenEvent.bidder = loadOrCreateCollector(bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(currentOwner, event.block).id

    populateEventDetails(event, tokenEvent)

    tokenEvent.save()

    return tokenEvent
}

export function createBidAcceptedEvent(
    event: ethereum.Event, tokenId: string, currentOwner: Address, bidder: Address, priceInWei: BigInt
): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEntity = loadNonNullableToken(tokenId)

    let tokenEventId = generateTokenEventId(EVENT_TYPES.BID_ACCEPTED, tokenEntity, bidder, timestamp);

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadNonNullableEdition(tokenEntity.editionNumber);
    editionEntity.save()

    tokenEvent.name = EVENT_TYPES.BID_ACCEPTED
    tokenEvent.version = editionEntity.version
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(priceInWei)
    tokenEvent.buyer = loadOrCreateCollector(bidder, event.block).id
    tokenEvent.bidder = loadOrCreateCollector(bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(currentOwner, event.block).id

    populateEventDetails(event, tokenEvent)

    tokenEvent.save()

    return tokenEvent
}

export function createBidRejectedEvent(
    event: ethereum.Event, tokenId: string, currentOwner: Address, bidder: Address, priceInWei: BigInt
): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEntity = loadNonNullableToken(tokenId)

    let tokenEventId = generateTokenEventId(EVENT_TYPES.BID_REJECTED, tokenEntity, bidder, timestamp);

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadNonNullableEdition(tokenEntity.editionNumber);
    editionEntity.save()

    tokenEvent.name = EVENT_TYPES.BID_REJECTED
    tokenEvent.version = editionEntity.version
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(priceInWei)
    tokenEvent.bidder = loadOrCreateCollector(bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(currentOwner, event.block).id

    populateEventDetails(event, tokenEvent)

    tokenEvent.save()

    return tokenEvent
}

export function createBidWithdrawnEvent(
    event: ethereum.Event, tokenId: string, bidder: Address
): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEntity = loadNonNullableToken(tokenId)

    let tokenEventId = generateTokenEventId(EVENT_TYPES.BID_WITHDRAWN, tokenEntity, bidder, timestamp);

    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadNonNullableEdition(tokenEntity.editionNumber);
    editionEntity.save()

    tokenEvent.name = EVENT_TYPES.BID_WITHDRAWN
    tokenEvent.version = editionEntity.version
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = ZERO_BIG_DECIMAL
    tokenEvent.bidder = loadOrCreateCollector(bidder, event.block).id
    let owner = contract.try_ownerOf(BigInt.fromString(tokenId));
    if (!owner.reverted) {
        tokenEvent.currentOwner = loadOrCreateCollector(owner.value, event.block).id
    }

    populateEventDetails(event, tokenEvent)

    tokenEvent.save()

    return tokenEvent
}

function populateEventDetails(event: ethereum.Event, tokenEvent: TokenEvent): void {
    tokenEvent.timestamp = event.block.timestamp;
    tokenEvent.transactionHash = event.transaction.hash;
    tokenEvent.transactionIndex = event.transaction.index;
    tokenEvent.logIndex = event.transactionLogIndex;
    tokenEvent.eventAddress = event.address;
    if (event.transaction.to) {
        tokenEvent.eventTxTo = event.transaction.to;
    }
    tokenEvent.eventTxFrom = event.transaction.from;
    tokenEvent.blockNumber = event.block.number;
}
