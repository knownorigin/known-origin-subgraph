import {TransferEvent} from "../../generated/schema";

import {
    Transfer
} from "../../generated/KnownOrigin/KnownOrigin";

export function createTransferEvent(event: Transfer): TransferEvent {
    let transferEventId = event.params._tokenId.toString().concat(event.transaction.hash.toHexString()).concat(event.transaction.index.toString());
    let transferEvent = new TransferEvent(transferEventId);
    transferEvent.from = event.params._from;
    transferEvent.to = event.params._to;
    transferEvent.tokenId = event.params._tokenId;
    transferEvent.timestamp = event.block.timestamp;
    transferEvent.transactionHash = event.transaction.hash

    return transferEvent;
}
