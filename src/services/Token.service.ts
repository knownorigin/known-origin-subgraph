import {BigDecimal, BigInt, Bytes, ipfs, json, JSONValue, log} from "@graphprotocol/graph-ts/index";
import {MetaData, Token} from "../../generated/schema";
import {ZERO} from "../constants";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {constructMetaData} from "./MetaData.service";

export function loadOrCreateToken(tokenId: BigInt, contract: KnownOrigin): Token | null {
    let tokenEntity = Token.load(tokenId.toString())

    if (tokenEntity == null) {
        let _tokenData = contract.tokenData(tokenId)
        tokenEntity = new Token(tokenId.toString())
        tokenEntity.transfers = new Array<string>()
        tokenEntity.allOwners = new Array<string>()

        // Entity fields can be set using simple assignments
        tokenEntity.transferCount = ZERO // set up the owner count
        tokenEntity.tokenId = tokenId
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.tokenURI = _tokenData.value3

        tokenEntity.birthTimestamp = ZERO
        tokenEntity.lastTransferTimestamp = ZERO

        let metaData = constructMetaData(_tokenData.value3);
        metaData.save()
        tokenEntity.metadata = metaData.id
    }

    return tokenEntity;
}
