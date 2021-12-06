import {Address, BigDecimal, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {AuctionEvent, Edition} from "../../generated/schema";
import {toEther} from "../utils/utils";
import * as EVENT_TYPES from "../utils/EventTypes";

export function createBidPlacedEvent(
    event: ethereum.Event,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = event.block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_PLACED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = event.transaction.from

    populateEventDetails(event, auctionEvent)

    return auctionEvent
}

export function createBidAccepted(
    event: ethereum.Event,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = event.block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_ACCEPTED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = event.transaction.from

    populateEventDetails(event, auctionEvent)

    return auctionEvent
}

export function createBidRejected(
    event: ethereum.Event,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = event.block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_REJECTED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = event.transaction.from

    populateEventDetails(event, auctionEvent)

    return auctionEvent
}

export function createBidWithdrawn(
    event: ethereum.Event,
    edition: Edition,
    bidder: Address
): AuctionEvent {
    let timestamp = event.block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_WITHDRAWN
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = BigDecimal.fromString('0.0')
    auctionEvent.caller = event.transaction.from

    populateEventDetails(event, auctionEvent)

    return auctionEvent
}

export function createBidIncreased(
    event: ethereum.Event,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = event.block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_INCREASED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = event.transaction.from

    populateEventDetails(event, auctionEvent)

    return auctionEvent
}

function populateEventDetails(event: ethereum.Event, auctionEvent: AuctionEvent): void {
    auctionEvent.timestamp = event.block.timestamp;
    auctionEvent.transactionHash = event.transaction.hash;
    auctionEvent.logIndex = event.transaction.index;
    auctionEvent.eventAddress = event.address;
    if (event.transaction.to) {
        auctionEvent.eventTxTo = event.transaction.to;
    }
    auctionEvent.eventTxFrom = event.transaction.from;
    auctionEvent.blockNumber = event.block.number;
}
