import {BigInt} from "@graphprotocol/graph-ts";
import {loadEdition} from "./Edition.service";
import {AuctionEvent} from "../../generated/schema";

export function recordActiveEditionBid(editionNumber: BigInt, auctionEvent: AuctionEvent): void {
    var edition = loadEdition(editionNumber);
    edition.activeBid = auctionEvent.id;
    edition.save();
}

export function removeActiveBidOnEdition(editionNumber: BigInt): void {
    var edition = loadEdition(editionNumber);
    edition.activeBid = null;
    edition.save();
}
