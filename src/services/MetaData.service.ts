import {Bytes, ipfs, json, JSONValue} from "@graphprotocol/graph-ts";
import {MetaData} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";

export function constructMetaData(tokenURI: string): MetaData | null {

    let ipfsParts: string[] = tokenURI.split('/')
    let ipfsHash: string = ipfsParts[ipfsParts.length - 1];

    let metaData: MetaData = new MetaData(ipfsHash)

    if (ipfsParts.length > 0) {
        let data = ipfs.cat(ipfsHash)
        if (data !== null) {
            let jsonData: JSONValue = json.fromBytes(data as Bytes)
            metaData.name = jsonData.toObject().get('name').toString()
            metaData.description = jsonData.toObject().get('description').toString()
            metaData.image = jsonData.toObject().get('image').toString()


            if (jsonData.toObject().isSet('attributes')) {
                let attributes: JSONValue = jsonData.toObject().get('attributes') as JSONValue;

                if (attributes.toObject().isSet('scarcity')) {
                    metaData.scarcity = attributes.toObject().get('scarcity').toString()
                }

                if (attributes.toObject().isSet('artist')) {
                    metaData.artist = attributes.toObject().get('artist').toString()
                }

                if (attributes.toObject().isSet("tags")) {
                    let rawTags: JSONValue[] = attributes.toObject().get("tags").toArray();
                    let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                        return value.toString();
                    });
                    metaData.tags = tags;
                }
            }
        }
    } else {
        log.error("Unknown IPFS hash found for token URI {}", [tokenURI]);
    }

    return metaData;
}
