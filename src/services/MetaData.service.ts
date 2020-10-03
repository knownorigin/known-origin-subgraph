import {Bytes, ipfs, json, JSONValue, JSONValueKind} from "@graphprotocol/graph-ts";
import {MetaData} from "../../generated/schema";
import {log, Result} from "@graphprotocol/graph-ts/index";

function loadIpfsData(tokenURI: string, ipfsHash: string): MetaData | null {
    let metaData: MetaData = new MetaData(ipfsHash);

    let data = ipfs.cat(ipfsHash)

    if (data !== null) {
        let result: Result<JSONValue, boolean> = json.try_fromBytes(data as Bytes)

        if (result.isOk) {

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
                let animation_url: JSONValue | null = jsonData.toObject().get('animation_url');
                if (animation_url) {
                    let isNull: boolean = (animation_url as JSONValue).isNull();
                    if (!isNull) {
                        metaData.animation_url = animation_url.toString()
                    }
                }
            }

            if (isObject(jsonData) && jsonData.toObject().isSet('attributes')) {

                let attributes: JSONValue = jsonData.toObject().get('attributes') as JSONValue;

                ///////////////////////////////
                // Artist, scarcity and tags //
                ///////////////////////////////

                if (isObject(attributes) && attributes.toObject().isSet('scarcity')) {
                    metaData.scarcity = attributes.toObject().get('scarcity').toString()
                }
                if (isObject(attributes) && attributes.toObject().isSet('artist')) {
                    metaData.artist = attributes.toObject().get('artist').toString()
                }
                if (isObject(attributes) && attributes.toObject().isSet("tags")) {
                    let rawTags: JSONValue[] = attributes.toObject().get("tags").toArray();
                    let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                        return value.toString();
                    });
                    metaData.tags = tags;
                }

                ///////////
                // Image //
                ///////////

                if (isObject(attributes) && attributes.toObject().isSet('asset_type')) {
                    let assetType: JSONValue | null = attributes.toObject().get('asset_type');
                    if (assetType) {
                        let isNull: boolean = (assetType as JSONValue).isNull();
                        if (!isNull) {
                            metaData.image_type = assetType.toString()
                        }
                    }
                }
                if (isObject(attributes) && attributes.toObject().isSet('asset_size_in_bytes')) {
                    let assetSizeInBytes: JSONValue | null = attributes.toObject().get('asset_size_in_bytes');
                    if (assetSizeInBytes) {
                        let isNull: boolean = (assetSizeInBytes as JSONValue).isNull();
                        if (!isNull) {
                            metaData.image_size_in_bytes = assetSizeInBytes.toBigInt()
                        }
                    }
                }

                /////////////////
                // Cover image //
                /////////////////

                if (isObject(attributes) && attributes.toObject().isSet('cover_image')) {
                    let coverImage: JSONValue | null = attributes.toObject().get('cover_image');
                    if (coverImage) {
                        let isNull: boolean = (coverImage as JSONValue).isNull();
                        if (!isNull) {
                            metaData.cover_image = coverImage.toString()
                        }
                    }
                }
                if (isObject(attributes) && attributes.toObject().isSet('cover_image_type')) {
                    let coverImageType: JSONValue | null = attributes.toObject().get('cover_image_type');
                    if (coverImageType) {
                        let isNull: boolean = (coverImageType as JSONValue).isNull();
                        if (!isNull) {
                            metaData.cover_image_type = coverImageType.toString()
                        }
                    }
                }
                if (isObject(attributes) && attributes.toObject().isSet('cover_image_size_in_bytes')) {
                    let coverImageSizeInBytes: JSONValue | null = attributes.toObject().get('cover_image_size_in_bytes');
                    if (coverImageSizeInBytes) {
                        let isNull: boolean = (coverImageSizeInBytes as JSONValue).isNull();
                        if (!isNull) {
                            metaData.cover_image_size_in_bytes = coverImageSizeInBytes.toBigInt()
                        }
                    }
                }
            }
        } else {
            log.error("IPFS result conversion failed for token URI {}", [tokenURI]);
            return null;
        }
    } else {
        log.error("Failed to find IPFS, data null for token URI {} ", [tokenURI]);
        return null;
    }

    return metaData;
}

export function constructMetaData(tokenURI: string): MetaData | null {
    log.info("constructMetaData() for tokenURI [{}]", [tokenURI]);

    let ipfsParts: string[] = tokenURI.split('/')

    if (ipfsParts.length > 0) {
        let ipfsHash: string = ipfsParts[ipfsParts.length - 1];

        let metaData: MetaData | null = loadIpfsData(tokenURI, ipfsHash);

        let maxTries = 1;
        while (!metaData && maxTries < 10) {
            log.info("Attempt {} at getting IPFS data {}", [maxTries.toString(), tokenURI]);
            metaData = loadIpfsData(tokenURI, ipfsHash);
            maxTries++;
        }

        return metaData;
    } else {
        log.error("Unknown IPFS hash found for token URI {}", [tokenURI]);
    }
    return null;
}

function isObject(jsonData: JSONValue): boolean {
    return jsonData.kind === JSONValueKind.OBJECT
}
