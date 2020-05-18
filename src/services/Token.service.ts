import {BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {Token} from "../../generated/schema";
import {ZERO, ZERO_BIG_DECIMAL} from "../constants";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {constructMetaData} from "./MetaData.service";
import {loadOrCreateCollector} from "./Collector.service";

export function loadOrCreateToken(tokenId: BigInt, contract: KnownOrigin, block: ethereum.Block): Token | null {
    let tokenEntity = Token.load(tokenId.toString())

    if (tokenEntity == null) {
        let _tokenData = contract.tokenData(tokenId)
        tokenEntity = new Token(tokenId.toString())
        tokenEntity.transfers = new Array<string>()
        tokenEntity.allOwners = new Array<string>()
        tokenEntity.openOffer = null
        tokenEntity.tokenEvents = new Array<string>()

        // Entity fields can be set using simple assignments
        tokenEntity.transferCount = ZERO // set up the owner count
        tokenEntity.tokenId = tokenId
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.tokenURI = _tokenData.value3

        let collector = loadOrCreateCollector(_tokenData.value4, block);
        collector.save();

        tokenEntity.currentOwner = collector.id

        tokenEntity.birthTimestamp = ZERO
        tokenEntity.lastTransferTimestamp = ZERO
        tokenEntity.primaryValueInEth = ZERO_BIG_DECIMAL
        tokenEntity.lastSalePriceInEth = ZERO_BIG_DECIMAL

        let metaData = constructMetaData(_tokenData.value3);
        metaData.save()
        tokenEntity.metadata = metaData.id

        tokenEntity.save();
    }

    return tokenEntity;
}
