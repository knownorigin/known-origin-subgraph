import {Collector} from "../../generated/schema";
import {toEther} from "../utils/utils";

import {Address, BigInt, Bytes, ethereum} from "@graphprotocol/graph-ts/index";
import {ONE, ZERO, ZERO_BIG_DECIMAL} from "../utils/constants";

export function loadOrCreateCollector(address: Address, block: ethereum.Block): Collector {
    let collectorEntity = Collector.load(address);
    if (collectorEntity == null) {
        collectorEntity = new Collector(address);
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
        collectorEntity.tokenIds = new Array<Bytes>();
    }
    collectorEntity.save()
    return collectorEntity as Collector;
}

export function collectorInList(collector: Collector | null, owners: Bytes[]): boolean {
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

export function addTokenToCollector(address: Address, block: ethereum.Block, tokenId: string): Collector {
    let collector = loadOrCreateCollector(address, block);
    let collectorToTokens = collector.tokenIds;
    collectorToTokens.push(Bytes.fromUTF8(tokenId));
    collector.tokenIds = collectorToTokens;
    collector.save();
    return collector
}

export function removeTokenFromCollector(address: Address, block: ethereum.Block, tokenId: string): Collector {
    let collector = loadOrCreateCollector(address, block);
    let collectorTokens = new Array<Bytes>()
    let existingTokens = collector.tokenIds;
    for (let i = 0; i < existingTokens.length; i++) {
        let currentTokenId = existingTokens[i];
        if (currentTokenId.toString() !== tokenId.toString()) {
            collectorTokens.push(currentTokenId)
        }
    }
    collector.tokenIds = collectorTokens;
    collector.save();
    return collector
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
