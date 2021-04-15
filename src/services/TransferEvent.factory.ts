import {Edition, TransferEvent} from "../../generated/schema";

import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";

export function createTransferEvent(event: ethereum.Event, tokenId: BigInt, from: Address, to: Address, edition: Edition): TransferEvent {
    let transferEventId = tokenId.toString().concat(event.transaction.hash.toHexString()).concat(event.transaction.index.toString());
    let transferEvent = new TransferEvent(transferEventId);
    transferEvent.version = edition.version
    transferEvent.edition = edition.id;
    transferEvent.from = from;
    transferEvent.to = to;
    transferEvent.tokenId = tokenId;
    transferEvent.timestamp = event.block.timestamp;
    transferEvent.transactionHash = event.transaction.hash
    return transferEvent;
}
