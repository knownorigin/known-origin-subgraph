import {BigDecimal, BigInt, Bytes, ipfs, json, JSONValue, log} from "@graphprotocol/graph-ts/index";
import {Token} from "../../generated/schema";
import {ZERO} from "../constants";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";

export function loadOrCreateToken(tokenId: BigInt, contract: KnownOrigin): Token | null {
    let tokenEntity = Token.load(tokenId.toString())
    if (tokenEntity == null) {
        let _tokenData = contract.tokenData(tokenId)
        tokenEntity = new Token(tokenId.toString())

        // Entity fields can be set using simple assignments
        tokenEntity.ownerCount = ZERO // set up the owner count
        tokenEntity.tokenId = tokenId
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.highestValue = ZERO
        tokenEntity.highestValueInEth = new BigDecimal(ZERO)

        // IPFS - these need to be in graph's IPFS node for now
        let ipfsParts: string[] = _tokenData.value3.split('/')
        if (ipfsParts.length > 0) {

            let path: string = ipfsParts[ipfsParts.length - 1]
            let data = ipfs.cat(path)
            if (data !== null) {
                let jsonData: JSONValue = json.fromBytes(data as Bytes)
                tokenEntity.name = jsonData.toObject().get('name').toString()
                tokenEntity.description = jsonData.toObject().get('description').toString()
                tokenEntity.image = jsonData.toObject().get('image').toString()
                // tokenEntity.tags = jsonData.toObject().get('attributes').toObject().get('tags').toArray()

                log.info("Adding [{}]", [tokenEntity.name])
            }
        }

        tokenEntity.tokenURI = _tokenData.value3
    }

    return tokenEntity;
}