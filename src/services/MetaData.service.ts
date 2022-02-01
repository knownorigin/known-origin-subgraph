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

            let jsonData = result.value;
            if (!jsonData || !isObject(jsonData)) {
                metaData.name = "";
                metaData.description = "";
                metaData.image = "";
                return metaData;
            }

            let name: JSONValue | null = jsonData.toObject().get('name')
            if (name) {
                metaData.name = name.toString()
            } else {
                metaData.name = ""
            }

            let description: JSONValue | null = jsonData.toObject().get('description');
            if (description) {
                metaData.description = description.toString()
            } else {
                metaData.description = ""
            }

            let image: JSONValue | null = jsonData.toObject().get('image');
            if (image) {
                metaData.image = image.toString()
            } else {
                metaData.image = ""
            }

            let animation_url: JSONValue | null = jsonData.toObject().get('animation_url');
            if (animation_url) {
                let isNull: boolean = (animation_url as JSONValue).isNull();
                if (!isNull) {
                    log.debug("Setting animation_url for {} ", [ipfsHash]);
                    metaData.animation_url = animation_url.toString()
                }
            }

            let image_sphere: JSONValue | null = jsonData.toObject().get('image_sphere');
            if (image_sphere) {
                let isNull: boolean = (image_sphere as JSONValue).isNull();
                if (!isNull) {
                    log.debug("Setting image_sphere for {} ", [ipfsHash]);
                    metaData.image_sphere = image_sphere.toBool()
                }
            }

            let attributes: JSONValue | null = jsonData.toObject().get('attributes');
            if (attributes && !(attributes as JSONValue).isNull()) {

                ///////////////////////////////
                // Artist, scarcity and tags //
                ///////////////////////////////

                let scarcity: JSONValue | null = attributes.toObject().get('scarcity');
                if (scarcity) {
                    let isNull: boolean = (scarcity as JSONValue).isNull();
                    if (!isNull) {
                        metaData.scarcity = scarcity.toString()
                    }
                }

                let artist: JSONValue | null = attributes.toObject().get('artist');
                if (artist) {
                    let isNull: boolean = (artist as JSONValue).isNull();
                    if (!isNull) {
                        metaData.artist = artist.toString()
                    }
                }

                let rawProductionYear: JSONValue | null = attributes.toObject().get('production_year');
                if (rawProductionYear) {
                    let isNull: boolean = (rawProductionYear as JSONValue).isNull();
                    if (!isNull) {
                        metaData.production_year = rawProductionYear.toString()
                    }
                }

                let rawFormat: JSONValue | null = attributes.toObject().get('format');
                if (rawFormat) {
                    let isNull: boolean = (rawFormat as JSONValue).isNull();
                    if (!isNull) {
                        metaData.format = rawFormat.toString()
                    }
                }

                let rawTheme: JSONValue | null = attributes.toObject().get('theme');
                if (rawTheme) {
                    let isNull: boolean = (rawTheme as JSONValue).isNull();
                    if (!isNull) {
                        metaData.theme = rawTheme.toString()
                    }
                }

                let rawNsfw: JSONValue | null = attributes.toObject().get('nsfw');
                if (rawNsfw) {
                    let isNull: boolean = (rawNsfw as JSONValue).isNull();
                    if (!isNull) {
                        metaData.nsfw = rawNsfw.toBool()
                    }
                }

                let rawTagsObj: JSONValue | null = attributes.toObject().get("tags");
                if (rawTagsObj) {
                    let isNull: boolean = (rawTagsObj as JSONValue).isNull();
                    if (!isNull) {
                        let rawTags: JSONValue[] = rawTagsObj.toArray();
                        let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                            return value.toString();
                        });
                        metaData.tags = tags;
                    }
                }

                ///////////
                // Image //
                ///////////

                let assetType: JSONValue | null = attributes.toObject().get('asset_type');
                if (assetType) {
                    let isNull: boolean = (assetType as JSONValue).isNull();
                    if (!isNull) {
                        metaData.image_type = assetType.toString()
                    }
                }

                let assetSizeInBytes: JSONValue | null = attributes.toObject().get('asset_size_in_bytes');
                if (assetSizeInBytes) {
                    let isNull: boolean = (assetSizeInBytes as JSONValue).isNull();
                    if (!isNull) {
                        metaData.image_size_in_bytes = assetSizeInBytes.toBigInt()
                    }
                }

                /////////////////
                // Cover image //
                /////////////////

                let coverImageType: JSONValue | null = attributes.toObject().get('cover_image_type');
                if (coverImageType) {
                    let isNull: boolean = (coverImageType as JSONValue).isNull();
                    if (!isNull) {
                        metaData.cover_image_type = coverImageType.toString()
                    }
                    // Set cover image to image if cover image is found
                    metaData.cover_image = metaData.image
                }

                let coverImageSizeInBytes: JSONValue | null = attributes.toObject().get('cover_image_size_in_bytes');
                if (coverImageSizeInBytes) {
                    let isNull: boolean = (coverImageSizeInBytes as JSONValue).isNull();
                    if (!isNull) {
                        metaData.cover_image_size_in_bytes = coverImageSizeInBytes.toBigInt()
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
