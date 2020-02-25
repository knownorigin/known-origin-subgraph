import {Collector} from "../../generated/schema";

import {Address, BigInt, EthereumBlock} from "@graphprotocol/graph-ts/index";
import {ONE, ZERO} from "../constants";

export function loadOrCreateCollector(address: Address, block: EthereumBlock): Collector | null {
    let collectorEntity: Collector | null = Collector.load(address.toHexString());
    if (collectorEntity == null) {
        collectorEntity = new Collector(address.toHexString());
        collectorEntity.address = address;
        collectorEntity.firstSeen = block.timestamp;
        collectorEntity.firstPurchaseTimeStamp = ZERO;
        collectorEntity.primarySaleCount = ZERO;
        collectorEntity.primarySaleEthSpent = ZERO;
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

export function addPrimarySaleToCollector(block: EthereumBlock, address: Address, value: BigInt, editionNumber: BigInt, tokenId: BigInt): void {
    let collector = loadOrCreateCollector(address, block);

    if (!collector.firstPurchaseTimeStamp) {
        collector.firstPurchaseTimeStamp = block.timestamp;
    }
    collector.lastPurchaseTimeStamp = block.timestamp;

    collector.primarySaleCount = collector.primarySaleCount.plus(ONE);
    collector.primarySaleEthSpent = collector.primarySaleEthSpent.plus(value);

    collector.save()
}
