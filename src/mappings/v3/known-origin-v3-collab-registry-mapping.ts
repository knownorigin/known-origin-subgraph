import {
    FutureRoyaltiesHandlerSetup,
    HandlerAdded,
    HandlerRemoved,
    RoyaltiesHandlerSetup,
    RoyaltyRecipientCreated
} from "../../../generated/KODAV3CollabRegistry/KODAV3CollabRegistry";
import {CollabHandlers} from "../../../generated/schema";
import { Bytes} from "@graphprotocol/graph-ts/index";

export function handleRoyaltyRecipientCreated(event: RoyaltyRecipientCreated): void {
    let collab = CollabHandlers.load(event.params.deployedHandler.toHexString())
    if (collab == null) {
        collab = new CollabHandlers(event.params.deployedHandler.toHexString());
    }
    collab.baseHandler = event.params.handler;
    collab.creator = event.params.creator;
    collab.recipients = event.params.recipients.map<Bytes>(a => (Bytes.fromHexString(a.toHexString()) as Bytes))
    collab.splits = event.params.splits;
    collab.createdTimestamp = event.block.timestamp
    collab.transactionHash = event.transaction.hash
    collab.save()
}

export function handleRoyaltiesHandlerSetup(event: RoyaltiesHandlerSetup): void {

}

export function handleFutureRoyaltiesHandlerSetup(event: FutureRoyaltiesHandlerSetup): void {

}

export function handleHandlerAdded(event: HandlerAdded): void {

}

export function handleHandlerRemoved(event: HandlerRemoved): void {

}
