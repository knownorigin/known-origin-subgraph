import {ethereum, log, Address} from "@graphprotocol/graph-ts/index";
import {TokenEvent} from "../../generated/schema";
import {ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {toEther} from "../utils";
import {loadOrCreateV2Edition, loadOrCreateV3EditionFromTokenId} from "./Edition.service";
import {
    BidAccepted,
    BidPlaced,
    BidRejected,
    BidWithdrawn
} from "../../generated/TokenMarketplace/TokenMarketplace";
import {loadOrCreateV2Token, loadOrCreateV3Token} from "./Token.service";
import {getKnownOriginV2ForAddress} from "./KnownOrigin.factory";
import {getArtistAddress} from "./AddressMapping.service";
import {Purchase, Transfer} from "../../generated/KnownOriginV2/KnownOriginV2";
import {loadOrCreateCollector} from "./Collector.service";
import * as KodaVersions from "../KodaVersions";
import {BigInt} from "@graphprotocol/graph-ts";
import {KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";

function generateTokenEventId(name: String, tokenId: BigInt, from: Address, to: Address, timestamp: BigInt): string {
    return name
        .concat("-")
        .concat(tokenId.toString())
        .concat("-")
        .concat(to.toHexString())
        .concat("-")
        .concat(timestamp.toString());
}

function populateEventData(event: ethereum.Event, tokenId: BigInt, from: Address, to: Address): TokenEvent {
    let timestamp = event.block.timestamp;
    let tokenEventId = generateTokenEventId("Transfer", tokenId, from, to, timestamp);

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = KodaVersions.KODA_V2

    // Show birth if first transfer
    tokenEvent.name = from.equals(ZERO_ADDRESS) ? 'Birth' : 'Transfer';
    tokenEvent.bidder = loadOrCreateCollector(to, event.block).id
    tokenEvent.ethValue = ZERO_BIG_DECIMAL
    tokenEvent.currentOwner = loadOrCreateCollector(from, event.block).id
    tokenEvent.timestamp = timestamp
    tokenEvent.transactionHash = event.transaction.hash

    return tokenEvent
}

///////////////
// Transfers //
///////////////

function createV2TokenTransferEvent(event: ethereum.Event, tokenId: BigInt, from: Address, to: Address): TokenEvent {

    // Setup token and add history
    let contract = getKnownOriginV2ForAddress(event.address)

    // Save the V2 token
    let tokenEntity = loadOrCreateV2Token(tokenId, contract, event.block)

    // Load edition
    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    // Populate data
    let tokenEvent = populateEventData(event, tokenId, from, to);
    tokenEvent.edition = editionEntity.id;
    tokenEvent.token = tokenEntity.id;

    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEvent.save()

    tokenEntity.save()

    return tokenEvent
}

function createV3TokenTransferEvent(event: ethereum.Event, tokenId: BigInt, from: Address, to: Address): TokenEvent {
    // Setup token and add history
    let kodaV3Contract = KnownOriginV3.bind(event.address);

    // Save the V2 token
    let tokenEntity = loadOrCreateV3Token(tokenId, kodaV3Contract, event.block)

    // Load edition
    let editionEntity = loadOrCreateV3EditionFromTokenId(tokenId, event.block, kodaV3Contract);
    editionEntity.save()

    // Populate data
    let tokenEvent = populateEventData(event, tokenId, from, to);
    tokenEvent.edition = editionEntity.id;
    tokenEvent.token = tokenEntity.id;

    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEvent.save()

    tokenEntity.save()

    return tokenEvent
}

export function createTokenTransferEvent(event: ethereum.Event, version: BigInt, tokenId: BigInt, from: Address, to: Address): TokenEvent {
    if (version.equals(KodaVersions.KODA_V3)) {
        log.debug("Handle V3 token event [{}]", [tokenId.toString()]);
        return createV3TokenTransferEvent(event, tokenId, from, to);
    }
    log.debug("Handle V2 token event [{}]", [tokenId.toString()]);
    return createV2TokenTransferEvent(event, tokenId, from, to);
}

///////////////////////
// Purchasing & Bids //
///////////////////////

export function createTokenPrimaryPurchaseEvent(event: Purchase): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "Purchase-"
        .concat(event.params._tokenId.toString())
        .concat("-")
        .concat(event.params._buyer.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = KodaVersions.KODA_V2

    // Setup token and add history
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'Purchase';
    tokenEvent.version = KodaVersions.KODA_V2
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.buyer = loadOrCreateCollector(event.params._buyer, event.block).id
    tokenEvent.ethValue = event.params._priceInWei.toBigDecimal()
    tokenEvent.currentOwner = loadOrCreateCollector(getArtistAddress(Address.fromString(editionEntity.artistAccount.toHexString())), event.block).id
    tokenEvent.timestamp = timestamp
    tokenEvent.transactionHash = event.transaction.hash

    tokenEvent.save()

    return tokenEvent
}

export function createBidPlacedEvent(event: BidPlaced): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidPlaced-"
        .concat(event.params._tokenId.toString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = KodaVersions.KODA_V2

    // Setup token and add history
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidPlaced'
    tokenEvent.version = KodaVersions.KODA_V2
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(event.params._amount)
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenEvent.timestamp = timestamp
    tokenEvent.transactionHash = event.transaction.hash

    tokenEvent.save()

    return tokenEvent
}

export function createBidAcceptedEvent(event: BidAccepted): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidAccepted-"
        .concat(event.params._tokenId.toString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = KodaVersions.KODA_V2

    // Setup token and add history
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidAccepted'
    tokenEvent.version = KodaVersions.KODA_V2
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(event.params._amount)
    tokenEvent.buyer = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenEvent.timestamp = timestamp
    tokenEvent.transactionHash = event.transaction.hash

    tokenEvent.save()

    return tokenEvent
}

export function createBidRejectedEvent(event: BidRejected): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidRejected-"
        .concat(event.params._tokenId.toString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = KodaVersions.KODA_V2

    // Setup token and add history
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidRejected'
    tokenEvent.version = KodaVersions.KODA_V2
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(event.params._amount)
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenEvent.timestamp = timestamp
    tokenEvent.transactionHash = event.transaction.hash

    tokenEvent.save()

    return tokenEvent
}

export function createBidWithdrawnEvent(event: BidWithdrawn): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidWithdrawn-"
        .concat(event.params._tokenId.toString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginV2ForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);
    tokenEvent.version = KodaVersions.KODA_V2

    // Setup token and add history
    let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateV2Edition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidWithdrawn'
    tokenEvent.version = KodaVersions.KODA_V2
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = ZERO_BIG_DECIMAL
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    let owner = contract.try_ownerOf(event.params._tokenId);
    if (!owner.reverted) {
        tokenEvent.currentOwner = loadOrCreateCollector(owner.value, event.block).id
    }
    tokenEvent.timestamp = timestamp
    tokenEvent.transactionHash = event.transaction.hash

    tokenEvent.save()

    return tokenEvent
}
