import {Bytes, ipfs, json, JSONValue, JSONValueKind} from "@graphprotocol/graph-ts";
import {MetaData} from "../../generated/schema";
import {log, Result} from "@graphprotocol/graph-ts/index";

export function constructMetaData(tokenURI: string): MetaData | null {

    log.info("constructMetaData() for tokenURI [{}]", [tokenURI]);

    let ipfsParts: string[] = tokenURI.split('/')

    if (ipfsParts.length > 0) {
        let ipfsHash: string = ipfsParts[ipfsParts.length - 1];

        let metaData: MetaData = new MetaData(ipfsHash)

        let data = ipfs.cat(ipfsHash)
        if (data !== null) {
            let result: Result<JSONValue, boolean> = json.try_fromBytes(data as Bytes)

            if (result.isOk) { // or: !result.isError
                // Do something with the JSON value
                let jsonData = result.value;

                if (isObject(jsonData) && jsonData.toObject().isSet('name')) {
                    metaData.name = jsonData.toObject().get('name').toString()
                } else {
                    metaData.name = ""
                }

                if (isObject(jsonData) && jsonData.toObject().isSet('description')) {
                    metaData.description = jsonData.toObject().get('description').toString()
                } else {
                    metaData.description = ""
                }

                if (isObject(jsonData) && jsonData.toObject().isSet('image')) {
                    metaData.image = jsonData.toObject().get('image').toString()
                } else {
                    metaData.image = ""
                }

                if (isObject(jsonData) && jsonData.toObject().isSet('animation_url')) {
                    metaData.animation_url = jsonData.toObject().get('animation_url').toString()
                }

                if (isObject(jsonData) && jsonData.toObject().isSet('attributes')) {

                    let attributes: JSONValue = jsonData.toObject().get('attributes') as JSONValue;

                    if (isObject(attributes) && attributes.toObject().isSet('scarcity')) {
                        metaData.scarcity = attributes.toObject().get('scarcity').toString()
                    }

                    if (isObject(attributes) && attributes.toObject().isSet('artist')) {
                        metaData.artist = attributes.toObject().get('artist').toString()
                    }

                    ///////////
                    // Image //
                    ///////////

                    if (isObject(attributes) && attributes.toObject().isSet('asset_type')) {
                        metaData.image_type = attributes.toObject().get('asset_type').toString()
                    }
                    if (isObject(attributes) && attributes.toObject().isSet('asset_size_in_bytes')) {
                        metaData.image_size_in_bytes = attributes.toObject().get('asset_size_in_bytes').toBigInt()
                    }

                    /////////////////
                    // Cover image //
                    /////////////////

                    if (isObject(attributes) && attributes.toObject().isSet('cover_image')) {
                        metaData.cover_image = attributes.toObject().get('cover_image').toString()
                    }
                    if (isObject(attributes) && attributes.toObject().isSet('cover_image_type')) {
                        metaData.cover_image_type = attributes.toObject().get('cover_image_type').toString()
                    }
                    if (isObject(attributes) && attributes.toObject().isSet('cover_image_size_in_bytes')) {
                        metaData.cover_image_size_in_bytes = attributes.toObject().get('cover_image_size_in_bytes').toBigInt()
                    }

                    if (isObject(attributes) && attributes.toObject().isSet("tags")) {
                        let rawTags: JSONValue[] = attributes.toObject().get("tags").toArray();
                        let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                            return value.toString();
                        });
                        metaData.tags = tags;
                    }
                }
            }
        }

        return metaData
    } else {
        log.error("Unknown IPFS hash found for token URI {}", [tokenURI]);
    }

    return null;
}

function isObject(jsonData: JSONValue): boolean {
    return jsonData.kind === JSONValueKind.OBJECT
}
