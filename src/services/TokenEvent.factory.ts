import {TokenEvent} from "../../generated/schema";
import {ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {toEther} from "../utils";
import {loadOrCreateEdition} from "./Edition.service";
import {
    BidAccepted,
    BidPlaced,
    BidRejected,
    BidWithdrawn
} from "../../generated/TokenMarketplace/TokenMarketplace";
import {loadOrCreateToken} from "./Token.service";
import {getKnownOriginForAddress} from "./KnownOrigin.factory";
import {Transfer} from "../../generated/KnownOrigin/KnownOrigin";
import {loadOrCreateCollector} from "./Collector.service";

export function createTokenTransferEvent(event: Transfer): TokenEvent {
    let timestamp = event.block.timestamp;

    // BidPlace-{tokenId}-{to}-{timestamp}
    let tokenEventId = "Transfer-"
        .concat(event.params._tokenId.toHexString())
        .concat("-")
        .concat(event.params._to.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    // Show birth if first transfer
    tokenEvent.name = event.params._from.equals(ZERO_ADDRESS) ? 'Birth' : 'Transfer';
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.bidder = loadOrCreateCollector(event.params._to, event.block).id
    tokenEvent.ethValue = ZERO_BIG_DECIMAL
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._from, event.block).id
    tokenEvent.timestamp = timestamp

    tokenEvent.save()

    return tokenEvent
}

export function createBidPlacedEvent(event: BidPlaced): TokenEvent {
    let timestamp = event.block.timestamp;

    // BidPlace-{tokenId}-{bidder}-{timestamp}
    let tokenEventId = "BidPlaced-"
        .concat(event.params._tokenId.toHexString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidPlaced'
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(event.params._amount)
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenEvent.timestamp = timestamp

    tokenEvent.save()

    return tokenEvent
}

export function createBidAcceptedEvent(event: BidAccepted): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidAccepted-"
        .concat(event.params._tokenId.toHexString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidAccepted'
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(event.params._amount)
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenEvent.timestamp = timestamp

    tokenEvent.save()

    return tokenEvent
}

export function createBidRejectedEvent(event: BidRejected): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidRejected-"
        .concat(event.params._tokenId.toHexString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidRejected'
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = toEther(event.params._amount)
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(event.params._currentOwner, event.block).id
    tokenEvent.timestamp = timestamp

    tokenEvent.save()

    return tokenEvent
}

export function createBidWithdrawnEvent(event: BidWithdrawn): TokenEvent {
    let timestamp = event.block.timestamp;

    let tokenEventId = "BidWithdrawn-"
        .concat(event.params._tokenId.toHexString())
        .concat("-")
        .concat(event.params._bidder.toHexString())
        .concat("-")
        .concat(timestamp.toString());

    let contract = getKnownOriginForAddress(event.address)

    let tokenEvent = new TokenEvent(tokenEventId);

    // Setup token and add history
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event)
    let tokenEvents = tokenEntity.tokenEvents;
    tokenEvents.push(tokenEvent.id);
    tokenEntity.tokenEvents = tokenEvents;
    tokenEntity.save()

    let editionEntity = loadOrCreateEdition(tokenEntity.editionNumber, event.block, contract);
    editionEntity.save()

    tokenEvent.name = 'BidWithdrawn'
    tokenEvent.token = tokenEntity.id;
    tokenEvent.edition = editionEntity.id;
    tokenEvent.ethValue = ZERO_BIG_DECIMAL
    tokenEvent.bidder = loadOrCreateCollector(event.params._bidder, event.block).id
    tokenEvent.currentOwner = loadOrCreateCollector(contract.ownerOf(event.params._tokenId), event.block).id
    tokenEvent.timestamp = timestamp

    tokenEvent.save()

    return tokenEvent
}
