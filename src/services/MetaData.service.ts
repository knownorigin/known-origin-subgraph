import {Bytes, ipfs, json, JSONValue, JSONValueKind} from "@graphprotocol/graph-ts";
import {MetaData} from "../../generated/schema";
import {BigInt, log, Result} from "@graphprotocol/graph-ts/index";


// Static list of manual overrides
// Historic legacy minting errors which have since been fixed and are not indexed due to slowness of indexing speed when crawling .call() methods
let MAPPING_OVERRIDES = new Map<String, String>();
// Edition ID to IPFS hash
MAPPING_OVERRIDES.set("23000", "QmQfekqvArSBwqUZisArmXpsZDb9cqyauHkyJBh141sR8Y")

function loadIpfsData(tokenURI: string, ipfsHash: string): MetaData | null {
    let metaData: MetaData = new MetaData(ipfsHash);

    let data = ipfs.cat(ipfsHash)

    if (data !== null) {
        let result: Result<JSONValue, boolean> = json.try_fromBytes(data as Bytes)

        if (result.isOk) {
            // Do something with the JSON value
            let jsonData = result.value;

            if (isObject(jsonData) && jsonData.toObject().isSet('name')) {
                // @ts-ignore
                metaData.name = jsonData.toObject().get('name').toString()
            } else {
                metaData.name = ""
            }

            if (isObject(jsonData) && jsonData.toObject().isSet('description')) {
                // @ts-ignore
                metaData.description = jsonData.toObject().get('description').toString()
            } else {
                metaData.description = ""
            }

            if (isObject(jsonData) && jsonData.toObject().isSet('image')) {
                // @ts-ignore
                metaData.image = jsonData.toObject().get('image').toString()
            } else {
                metaData.image = ""
            }

            if (isObject(jsonData) && jsonData.toObject().isSet('animation_url')) {
                let animation_url: JSONValue | null = jsonData.toObject().get('animation_url');
                if (animation_url) {
                    let isNull: boolean = (animation_url as JSONValue).isNull();
                    if (!isNull) {
                        log.info("Setting animation_url for {} ", [ipfsHash]);
                        metaData.animation_url = animation_url.toString()
                    }
                }
            }

            if (isObject(jsonData) && jsonData.toObject().isSet('image_sphere')) {
                let image_sphere: JSONValue | null = jsonData.toObject().get('image_sphere');
                if (image_sphere) {
                    let isNull: boolean = (image_sphere as JSONValue).isNull();
                    if (!isNull) {
                        log.info("Setting image_sphere for {} ", [ipfsHash]);
                        metaData.image_sphere = image_sphere.toBool()
                    }
                }
            }

            if (isObject(jsonData) && jsonData.toObject().isSet('attributes')) {
                let attributes: JSONValue = jsonData.toObject().get('attributes') as JSONValue;

                ///////////////////////////////
                // Artist, scarcity and tags //
                ///////////////////////////////

                if (isObject(attributes) && attributes.toObject().isSet('scarcity')) {
                    // @ts-ignore
                    metaData.scarcity = attributes.toObject().get('scarcity').toString()
                }

                if (isObject(attributes) && attributes.toObject().isSet('artist')) {
                    // @ts-ignore
                    metaData.artist = attributes.toObject().get('artist').toString()
                }

                if (isObject(attributes) && attributes.toObject().isSet('production_year')) {
                    let rawProductionYear: JSONValue | null = attributes.toObject().get('production_year');
                    let isNull: boolean = (rawProductionYear as JSONValue).isNull();
                    if (!isNull) {
                        // @ts-ignore
                        metaData.production_year = rawProductionYear.toString()
                    }
                }

                if (isObject(attributes) && attributes.toObject().isSet('category')) {
                    let rawCategory: JSONValue | null = attributes.toObject().get('category');
                    let isNull: boolean = (rawCategory as JSONValue).isNull();
                    if (!isNull) {
                        // @ts-ignore
                        metaData.category = rawCategory.toString()
                    }
                }

                if (isObject(attributes) && attributes.toObject().isSet('nsfw')) {
                    let rawNsfw: JSONValue | null = attributes.toObject().get('nsfw');
                    let isNull: boolean = (rawNsfw as JSONValue).isNull();
                    if (!isNull) {
                        // @ts-ignore
                        metaData.nsfw = rawNsfw.toBool()
                    }
                }

                if (isObject(attributes) && attributes.toObject().isSet("tags")) {
                    let rawTagsObj: JSONValue | null = attributes.toObject().get("tags");
                    if (rawTagsObj) {
                        let isNull: boolean = (rawTagsObj as JSONValue).isNull();
                        if (!isNull) {
                            // @ts-ignore
                            let rawTags: JSONValue[] = rawTagsObj.toArray();
                            let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                                return value.toString();
                            });
                            metaData.tags = tags;
                        }
                    }
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
        log.error(" Failed to find IPFS, data  null for token URI {} ", [tokenURI]);
        return null;
    }

    return metaData;
}

export function constructMetaData(editionNumber: BigInt, tokenURI: string): MetaData {
    log.info("constructMetaData() for tokenURI [{}]", [tokenURI]);

    let ipfsParts: string[] = tokenURI.split('/')

    if (ipfsParts.length > 0) {
        let ipfsHash: string = ipfsParts[ipfsParts.length - 1];
        log.info("constructMetaData() token URI ipfsHash [{}]", [ipfsHash]);

        if (MAPPING_OVERRIDES.has(editionNumber.toString())) {
            let override = MAPPING_OVERRIDES.get(editionNumber.toString()) as string;
            log.warning("Edition mapping override found for ID {} - mapped hash {}", [
                editionNumber.toString(),
                override
            ])
            ipfsHash = override;
        }

        // Check IPFS length is valid, some rinkeby IPFS hashes are bust so we need to handle this special case atm
        if (!ipfsHash || ipfsHash.length < 46) {
            log.error("Skipping invalid IPFS hash lookup", [(ipfsHash || "N/A")]);
            return new MetaData("invalid-ipfs-hash-" + (ipfsHash || "N/A"));
        }

        let metaData: MetaData | null = loadIpfsData(tokenURI, ipfsHash);

        let maxTries = 1;
        while (!metaData && maxTries < 10) {
            log.info("Attempt {} at getting IPFS data {}", [maxTries.toString(), tokenURI]);
            metaData = loadIpfsData(tokenURI, ipfsHash);
            maxTries++;
        }

        if (metaData) {
            return metaData as MetaData;
        }

        log.error("FAILED IPFS token URI load {}", [tokenURI]);
        return new MetaData(ipfsHash); // try and construct a object even if empty?
    } else {
        log.error("Unknown IPFS hash found for token URI {}", [tokenURI]);
    }
    return new MetaData("failed-ipfs-hash");
}

function isObject(jsonData: JSONValue): boolean {
    return jsonData.kind === JSONValueKind.OBJECT
}
