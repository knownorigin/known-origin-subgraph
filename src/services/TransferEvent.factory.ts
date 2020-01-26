import {Address, BigDecimal, BigInt, EthereumTransaction, EthereumBlock} from "@graphprotocol/graph-ts/index";
import {Artist, AuctionEvent, Edition} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {toEther} from "../utils";
import {
    Transfer
} from "../../generated/KnownOrigin/KnownOrigin";

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
    auctionEvent.edition = editionNumber.toString();
    auctionEvent.bidder = bidder
    auctionEvent.timestamp = timestamp
    auctionEvent.ethValue = toEther(ethValue)
    auctionEvent.caller = transaction.from

    return auctionEvent
}
