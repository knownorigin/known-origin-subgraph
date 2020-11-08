import {Collector} from "../../generated/schema";
import {toEther} from "../utils";

import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {ONE, ZERO, ZERO_BIG_DECIMAL} from "../constants";

export function loadOrCreateCollector(address: Address, block: ethereum.Block): Collector | null {
    let collectorEntity: Collector | null = Collector.load(address.toHexString());
    if (collectorEntity == null) {
        collectorEntity = new Collector(address.toHexString());
        collectorEntity.address = address;
        collectorEntity.firstSeen = block.timestamp;
        collectorEntity.firstPurchaseTimeStamp = ZERO;
        collectorEntity.lastPurchaseTimeStamp = ZERO;

        collectorEntity.primaryPurchaseCount = ZERO;
        collectorEntity.primaryPurchaseEthSpent = ZERO_BIG_DECIMAL;

        collectorEntity.secondarySaleCount = ZERO;
        collectorEntity.secondarySaleEthTotal = ZERO_BIG_DECIMAL;
        collectorEntity.secondaryPurchaseCount = ZERO;
        collectorEntity.secondaryPurchaseEthSpent = ZERO_BIG_DECIMAL;

        collectorEntity.totalPurchaseCount = ZERO;
        collectorEntity.totalPurchaseEthSpent = ZERO_BIG_DECIMAL;
    }
    collectorEntity.save()
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

export function addPrimarySaleToCollector(block: ethereum.Block, buyer: Address, value: BigInt): void {
    let collector = loadOrCreateCollector(buyer, block);

    if (!collector.firstPurchaseTimeStamp) {
        collector.firstPurchaseTimeStamp = block.timestamp;
    }
    collector.lastPurchaseTimeStamp = block.timestamp;

    collector.primaryPurchaseCount = collector.primaryPurchaseCount.plus(ONE);
    collector.primaryPurchaseEthSpent = collector.primaryPurchaseEthSpent.plus(toEther(value));

    collector.totalPurchaseCount = collector.totalPurchaseCount.plus(ONE);
    collector.totalPurchaseEthSpent = collector.totalPurchaseEthSpent.plus(toEther(value));

    collector.save()
}

export function addSecondaryPurchaseToCollector(block: ethereum.Block, buyer: Address, value: BigInt): void {
    let collector = loadOrCreateCollector(buyer, block);

    if (!collector.firstPurchaseTimeStamp) {
        collector.firstPurchaseTimeStamp = block.timestamp;
    }
    collector.lastPurchaseTimeStamp = block.timestamp;

    collector.secondaryPurchaseCount = collector.secondaryPurchaseCount.plus(ONE);
    collector.secondaryPurchaseEthSpent = collector.secondaryPurchaseEthSpent.plus(toEther(value));

    collector.totalPurchaseCount = collector.totalPurchaseCount.plus(ONE);
    collector.totalPurchaseEthSpent = collector.totalPurchaseEthSpent.plus(toEther(value));

    collector.save()
}

export function addSecondarySaleToSeller(block: ethereum.Block, buyer: Address, value: BigInt): void {
    let collector = loadOrCreateCollector(buyer, block);

    collector.secondarySaleCount = collector.secondarySaleCount.plus(ONE)
    collector.secondarySaleEthTotal = collector.secondarySaleEthTotal.plus(toEther(value));

    collector.save()
}
