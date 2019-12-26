import {Address, BigDecimal, BigInt, EthereumTransaction, EthereumBlock} from "@graphprotocol/graph-ts/index";
import {Artist, AuctionEvent, Edition} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {toEther} from "../utils";
import {loadEdition, loadOrCreateEdition} from "./Edition.service";
import {
    BidAccepted,
    BidIncreased,
    BidPlaced,
    BidRejected,
    BidWithdrawn
} from "../../generated/ArtistAcceptingBidsV2/ArtistAcceptingBidsV2";

export function createBidPlacedEvent(
    block: EthereumBlock,
    transaction: EthereumTransaction,
    editionNumber: BigInt,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(editionNumber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidPlaced'
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from

    return auctionEvent
}

export function createBidAccepted(
    block: EthereumBlock,
    transaction: EthereumTransaction,
    editionNumber: BigInt,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(editionNumber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidAccepted'
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from

    return auctionEvent
}

export function createBidRejected(
    block: EthereumBlock,
    transaction: EthereumTransaction,
    editionNumber: BigInt,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(editionNumber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidRejected'
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from

    return auctionEvent
}

export function createBidWithdrawn(
    block: EthereumBlock,
    transaction: EthereumTransaction,
    editionNumber: BigInt,
    bidder: Address
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(editionNumber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidWithdrawn'
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = BigDecimal.fromString('0.0')
    auctionEvent.caller = transaction.from

    return auctionEvent
}

export function createBidIncreased(
    block: EthereumBlock,
    transaction: EthereumTransaction,
    editionNumber: BigInt,
    bidder: Address,
    ethValue: BigInt
): AuctionEvent {
    let timestamp = block.timestamp
    let auctionEventId = timestamp.toString().concat(bidder.toHexString()).concat(editionNumber.toString())
    let auctionEvent = new AuctionEvent(auctionEventId);

    auctionEvent.name = 'BidIncreased'
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from

    return auctionEvent
}
