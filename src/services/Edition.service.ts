import {BigInt, Bytes, ipfs, json, JSONValue, log} from "@graphprotocol/graph-ts";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {Edition, MetaData} from "../../generated/schema";
import {ZERO} from "../constants";

export function loadOrCreateEdition(editionNumber: BigInt, contract: KnownOrigin): Edition | null {
    let editionEntity: Edition | null = Edition.load(editionNumber.toString());

    if (editionEntity == null) {
        editionEntity = new Edition(editionNumber.toString());
        let _editionData = contract.detailsOfEdition(editionNumber)

        editionEntity.createdTimestamp = ZERO
        editionEntity.editionData = _editionData.value0
        editionEntity.editionType = _editionData.value1
        editionEntity.startDate = _editionData.value2
        editionEntity.endDate = _editionData.value3
        editionEntity.artistAccount = _editionData.value4
        editionEntity.artistCommission = _editionData.value5
        editionEntity.priceInWei = _editionData.value6
        editionEntity.tokenURI = _editionData.value7
        editionEntity.totalSupply = _editionData.value8
        editionEntity.totalAvailable = _editionData.value9
        editionEntity.active = _editionData.value10

        log.info("token URI [{}]", [_editionData.value7])

        let ipfsParts: string[] = editionEntity.tokenURI.split('/')
        let ipfsHash: string = ipfsParts[ipfsParts.length - 1];

        let metaData: MetaData = new MetaData(ipfsHash)

        if (ipfsParts.length > 0) {
            let data = ipfs.cat(ipfsHash)
            if (data !== null) {
                let jsonData: JSONValue = json.fromBytes(data as Bytes)
                metaData.name = jsonData.toObject().get('name').toString()
                metaData.description = jsonData.toObject().get('description').toString()
                metaData.image = jsonData.toObject().get('image').toString()

                if (jsonData.toObject().isSet('scarcity')) {
                    metaData.scarcity = jsonData.toObject().get('scarcity').toString()
                }
                if (jsonData.toObject().isSet('artist')) {
                    metaData.artist = jsonData.toObject().get('artist').toString()
                }
                if (jsonData.toObject().isSet('attributes')) {
                    let attributes: JSONValue = jsonData.toObject().get('attributes') as JSONValue;
                    if (attributes.toObject().isSet("tags")) {
                        let rawTags: JSONValue[] = attributes.toObject().get("tags").toArray();
                        let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                            return value.toString();
                        });
                        metaData.tags = tags;
                    }
                }
            }
        }
        metaData.save()
        editionEntity.metadata = ipfsHash
    }

    return editionEntity;
}