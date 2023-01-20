import {
    FutureRoyaltiesHandlerSetup,
    HandlerAdded,
    HandlerRemoved,
    KODAV3CollabRegistry,
    RoyaltiesHandlerSetup,
    RoyaltyRecipientCreated
} from "../../../generated/KODAV3CollabRegistry/KODAV3CollabRegistry";

import {Collective, CollectiveHandlers} from "../../../generated/schema";
import {Bytes, log} from "@graphprotocol/graph-ts/index";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";

import * as editionService from "../../services/Edition.service";

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

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3CollabRegistry.bind(event.address).koda()
    );

    let editionEntity = editionService.loadOrCreateV3Edition(event.params.editionId, event.block, kodaV3Contract);

    log.info("handleRoyaltiesHandlerSetup() collective.recipients [{}]", [
        collective.recipients.toString()
    ]);

    // add all recipients to collaborators list
    let recipients: Array<Bytes> = collective.recipients;
    let collaborators: Array<Bytes> = editionEntity.collaborators
    for (let i: number = 0; i < recipients.length; i++) {
        // @ts-ignore
        let recipient: Bytes = recipients[i as i32];
        collaborators.push(recipient)
    }
    editionEntity.collaborators = collaborators
    editionEntity.collective = collective.id.toString()
    editionEntity.save()
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

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3CollabRegistry.bind(event.address).koda()
    );

    let editionEntity = editionService.loadOrCreateV3Edition(event.params.editionId, event.block, kodaV3Contract);
    editionEntity.collective = collective.id.toString()
    editionEntity.save()
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
        collective.recipients = new Array<Bytes>()
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
