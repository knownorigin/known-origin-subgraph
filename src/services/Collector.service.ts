import {Collector} from "../../generated/schema";

import {Address, EthereumBlock} from "@graphprotocol/graph-ts/index";

export function loadOrCreateCollector(address: Address, block: EthereumBlock): Collector | null {
    let collectorEntity: Collector | null = Collector.load(address.toHexString());
    if (collectorEntity == null) {
        collectorEntity = new Collector(address.toHexString());
        collectorEntity.address = address;
        collectorEntity.firstSeen = block.timestamp;
    }
    return collectorEntity;
}

export function collectorInList(collector: Collector | null, owners: string[]): boolean {
    if (collector == null) {
        return false;
    }
    for (let i = 0; i < owners.length; i++) {
        let owner = owners[i];
        if (owner.toString() == collector.id.toString()) {
            return true;
        }
    }
    return false;
}
