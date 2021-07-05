import {
    FutureRoyaltiesHandlerSetup,
    HandlerAdded,
    HandlerRemoved,
    RoyaltiesHandlerSetup,
    RoyaltyRecipientCreated
} from "../../../generated/KODAV3CollabRegistry/KODAV3CollabRegistry";
import {CollectiveHandlers, Collective} from "../../../generated/schema";
import {Bytes, log} from "@graphprotocol/graph-ts/index";

export function handleRoyaltyRecipientCreated(event: RoyaltyRecipientCreated): void {
    log.info("handleRoyaltyRecipientCreated() for clone [{}] - deployed address [{}]", [
        event.params.handler.toHexString(),
        event.params.deployedHandler.toHexString()
    ]);
    let collective = loadCollective(event.params.deployedHandler.toHexString())
    collective.baseHandler = event.params.handler;
    collective.creator = event.params.creator;
    collective.recipients = event.params.recipients.map<Bytes>(a => (Bytes.fromHexString(a.toHexString()) as Bytes))
    collective.splits = event.params.splits;
    collective.createdTimestamp = event.block.timestamp
    collective.transactionHash = event.transaction.hash
    collective.isDeployed = true
    collective.save()
}

export function handleRoyaltiesHandlerSetup(event: RoyaltiesHandlerSetup): void {
    log.info("handleRoyaltiesHandlerSetup() for edition [{}] - deployed address [{}]", [
        event.params.editionId.toString(),
        event.params.deployedHandler.toHexString()
    ]);
    let collective = loadCollective(event.params.deployedHandler.toHexString())

    let editions = collective.editions;
    editions.push(event.params.editionId.toString());
    collective.editions = editions;

    collective.isDeployed = true
    collective.save()
}

export function handleFutureRoyaltiesHandlerSetup(event: FutureRoyaltiesHandlerSetup): void {
    log.info("handleFutureRoyaltiesHandlerSetup() for edition [{}] - deployed address [{}]", [
        event.params.editionId.toString(),
        event.params.deployedHandler.toHexString()
    ]);
    let collective = loadCollective(event.params.deployedHandler.toHexString())

    let editions = collective.editions;
    editions.push(event.params.editionId.toString());
    collective.editions = editions;

    collective.isDeployed = false
    collective.save()
}

export function handleHandlerAdded(event: HandlerAdded): void {
    log.info("handleHandlerAdded() clone address [{}]", [
        event.params.handler.toHexString()
    ]);
    let collectiveHandler = loadCollectiveHandler(event.params.handler.toHexString());
    collectiveHandler.active = true
    collectiveHandler.lastUpdatedTimestamp = event.block.timestamp
    collectiveHandler.lastUpdatedTransactionHash = event.transaction.hash
    collectiveHandler.save()
}

export function handleHandlerRemoved(event: HandlerRemoved): void {
    log.info("handleHandlerRemoved() clone address [{}]", [
        event.params.handler.toHexString()
    ]);
    let collectiveHandler = loadCollectiveHandler(event.params.handler.toHexString());
    collectiveHandler.active = false
    collectiveHandler.lastUpdatedTimestamp = event.block.timestamp
    collectiveHandler.lastUpdatedTransactionHash = event.transaction.hash
    collectiveHandler.save()
}

function loadCollective(id: string): Collective {
    let collective = Collective.load(id)
    if (collective == null) {
        collective = new Collective(id);
        collective.editions = new Array<string>()
    }
    return collective as Collective;
}

function loadCollectiveHandler(id: string): CollectiveHandlers {
    let handler = CollectiveHandlers.load(id)
    if (handler == null) {
        handler = new CollectiveHandlers(id);
    }
    return handler as CollectiveHandlers;
}
