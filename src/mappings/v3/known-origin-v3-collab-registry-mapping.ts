import {
    FutureRoyaltiesHandlerSetup,
    HandlerAdded,
    HandlerRemoved,
    RoyaltiesHandlerSetup,
    RoyaltyRecipientCreated
} from "../../../generated/KODAV3CollabRegistry/KODAV3CollabRegistry";
import {BaseCollabHandlers, CollabHandlers} from "../../../generated/schema";
import {Bytes} from "@graphprotocol/graph-ts/index";

export function handleRoyaltyRecipientCreated(event: RoyaltyRecipientCreated): void {
    let collab = loadCollabHandler(event.params.deployedHandler.toHexString())
    collab.baseHandler = event.params.handler;
    collab.creator = event.params.creator;
    collab.recipients = event.params.recipients.map<Bytes>(a => (Bytes.fromHexString(a.toHexString()) as Bytes))
    collab.splits = event.params.splits;
    collab.createdTimestamp = event.block.timestamp
    collab.transactionHash = event.transaction.hash
    collab.isDeployed = true
    collab.save()
}

export function handleRoyaltiesHandlerSetup(event: RoyaltiesHandlerSetup): void {
    let collab = loadCollabHandler(event.params.deployedHandler.toHexString())
    collab.editionNmber = event.params.editionId
    collab.isDeployed = true
    collab.save()
}

export function handleFutureRoyaltiesHandlerSetup(event: FutureRoyaltiesHandlerSetup): void {
    let collab = loadCollabHandler(event.params.deployedHandler.toHexString())
    collab.editionNmber = event.params.editionId
    collab.isDeployed = false
    collab.save()
}

export function handleHandlerAdded(event: HandlerAdded): void {
    let baseHandler = loadBaseCollabHandler(event.params.handler.toHexString());
    baseHandler.active = true
    baseHandler.lastUpdatedTimestamp = event.block.timestamp
    baseHandler.lastUpdatedTransactionHash = event.transaction.hash
    baseHandler.save()
}

export function handleHandlerRemoved(event: HandlerRemoved): void {
    let baseHandler = loadBaseCollabHandler(event.params.handler.toHexString());
    baseHandler.active = false
    baseHandler.lastUpdatedTimestamp = event.block.timestamp
    baseHandler.lastUpdatedTransactionHash = event.transaction.hash
    baseHandler.save()
}

function loadCollabHandler(id: string): CollabHandlers {
    let collab = CollabHandlers.load(id)
    if (collab == null) {
        collab = new CollabHandlers(id);
    }
    return collab as CollabHandlers;
}

function loadBaseCollabHandler(id: string): BaseCollabHandlers {
    let handler = BaseCollabHandlers.load(id)
    if (handler == null) {
        handler = new BaseCollabHandlers(id);
    }
    return handler as BaseCollabHandlers;
}
