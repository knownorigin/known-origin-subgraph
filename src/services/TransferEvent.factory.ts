import {Edition, TransferEvent} from "../../generated/schema";

import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";

export function createTransferEvent(event: ethereum.Event, tokenId: BigInt, from: Address, to: Address, edition: Edition): TransferEvent {
    let transferEventId = tokenId.toString()
        .concat("-")
        .concat(edition.version.toHexString())
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.transaction.index.toString());

    let transferEvent = new TransferEvent(transferEventId);
    transferEvent.version = edition.version
    transferEvent.edition = edition.id;
    transferEvent.from = from;
    transferEvent.to = to;
    transferEvent.tokenId = tokenId;

    populateEventDetails(event, transferEvent)

    return transferEvent;
}

function populateEventDetails(event: ethereum.Event, transferEvent: TransferEvent): void {
    transferEvent.timestamp = event.block.timestamp;
    transferEvent.transactionHash = event.transaction.hash;
    transferEvent.transactionIndex = event.transaction.index;
    transferEvent.logIndex = event.transactionLogIndex;
    transferEvent.eventAddress = event.address;
    if (event.transaction.to) {
        transferEvent.eventTxTo = event.transaction.to;
    }
    transferEvent.eventTxFrom = event.transaction.from;
    transferEvent.blockNumber = event.block.number;
}
