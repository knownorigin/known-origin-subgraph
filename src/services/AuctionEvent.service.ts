import {BigInt, log} from "@graphprotocol/graph-ts";
import {loadV2Edition} from "./Edition.service";
import {AuctionEvent} from "../../generated/schema";

export function recordActiveEditionBid(editionNumber: BigInt, auctionEvent: AuctionEvent): void {
    let edition = loadV2Edition(editionNumber);
    if (edition) {
        edition.activeBid = auctionEvent.id;
        edition.save();
    }
}

export function removeActiveBidOnEdition(editionNumber: BigInt): void {
    log.info("Removing active edition bid for  edition {}  ", [editionNumber.toString()]);
    let edition = loadV2Edition(editionNumber);
    if (edition) {
        edition.activeBid = null;
        edition.save();
    }
}
