import {BigInt, log} from "@graphprotocol/graph-ts";
import {loadNonNullableEdition} from "./Edition.service";
import {AuctionEvent} from "../../generated/schema";

export function recordActiveEditionBid(editionNumber: BigInt, auctionEvent: AuctionEvent): void {
    let edition = loadNonNullableEdition(editionNumber.toString());
    edition.activeBid = auctionEvent.id;
    edition.save();
}

export function removeActiveBidOnEdition(editionNumber: BigInt): void {
    log.info("Removing active edition bid for edition {}", [editionNumber.toString()]);
    let edition = loadNonNullableEdition(editionNumber.toString());
    edition.activeBid = null;
    edition.save();
}
