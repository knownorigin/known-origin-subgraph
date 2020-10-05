import {BigInt, log} from "@graphprotocol/graph-ts";
import {loadEdition} from "./Edition.service";
import {AuctionEvent} from "../../generated/schema";

export function recordActiveEditionBid(editionNumber: BigInt, auctionEvent: AuctionEvent): void {
    let edition = loadEdition(editionNumber);
    edition.activeBid = auctionEvent.id;
    edition.save();
}

export function removeActiveBidOnEdition(editionNumber: BigInt): void {
    log.info("Removing active edition bid for edition {}", [editionNumber.toString()]);
    let edition = loadEdition(editionNumber);
    edition.activeBid = null;
    edition.save();
}
