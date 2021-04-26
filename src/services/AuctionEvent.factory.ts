import {Address, BigDecimal, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {AuctionEvent, Edition} from "../../generated/schema";
import {toEther} from "../utils/utils";
import * as EVENT_TYPES from "../utils/EventTypes";

export function createBidPlacedEvent(
    block: ethereum.Block,
    transaction: ethereum.Transaction,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_PLACED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from
    auctionEvent.transactionHash = transaction.hash

    return auctionEvent
}

export function createBidAccepted(
    block: ethereum.Block,
    transaction: ethereum.Transaction,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_ACCEPTED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from
    auctionEvent.transactionHash = transaction.hash

    return auctionEvent
}

export function createBidRejected(
    block: ethereum.Block,
    transaction: ethereum.Transaction,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_REJECTED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from
    auctionEvent.transactionHash = transaction.hash

    return auctionEvent
}

export function createBidWithdrawn(
    block: ethereum.Block,
    transaction: ethereum.Transaction,
    edition: Edition,
    bidder: Address
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_WITHDRAWN
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = BigDecimal.fromString('0.0')
    auctionEvent.caller = transaction.from
    auctionEvent.transactionHash = transaction.hash

    return auctionEvent
}

export function createBidIncreased(
    block: ethereum.Block,
    transaction: ethereum.Transaction,
    edition: Edition,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(edition.editionNmber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = EVENT_TYPES.BID_INCREASED
    auctionEvent.version = edition.version
    auctionEvent.edition = edition.editionNmber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from
    auctionEvent.transactionHash = transaction.hash

    return auctionEvent
}
