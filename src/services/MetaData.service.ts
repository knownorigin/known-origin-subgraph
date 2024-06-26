import {Bytes, dataSource, json, JSONValue, JSONValueKind} from "@graphprotocol/graph-ts";
import {MetaData} from "../../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";
import { MetaData as MetaDataTemplate } from "../../generated/templates";


// Static list of manual overrides
// Historic legacy minting errors which have since been fixed and are not indexed due to slowness of indexing speed when crawling .call() methods
let MAPPING_OVERRIDES = new Map<String, String>();
// Edition ID to IPFS hash
MAPPING_OVERRIDES.set("23000", "QmQfekqvArSBwqUZisArmXpsZDb9cqyauHkyJBh141sR8Y")

function artistOverrides(editionId:string, originalName:string) : string {
    // Invalid manual mint from back in the day
    if(editionId === "22000"){
        return "XCOPY"
    }
    return originalName;
}

export function handleMetaData(content: Bytes): void {
    const ipfsHash = dataSource.stringParam()
    log.info('Handling Metadata for IPFS hash', [ipfsHash])
    let metaData = new MetaData(ipfsHash)
    const jsonObject = json.fromBytes(content).toObject()

    if (jsonObject) {
        if (jsonObject.isSet('name')) {
            // @ts-ignore
            metaData.name = jsonObject.mustGet('name').toString()
        } else {
            metaData.name = ""
        }

        if (jsonObject.isSet('description')) {
            // @ts-ignore
            metaData.description = jsonObject.mustGet('description').toString()
        } else {
            metaData.description = ""
        }

        if (jsonObject.isSet('image')) {
            // @ts-ignore
            metaData.image = jsonObject.mustGet('image').toString()
        } else {
            metaData.image = ""
        }

        if (jsonObject.isSet('animation_url')) {
            let animation_url: JSONValue | null = jsonObject.get('animation_url');
            if (animation_url) {
                let isNull: boolean = (animation_url as JSONValue).isNull();
                if (!isNull) {
                    log.info("Setting animation_url for {} ", [ipfsHash]);
                    metaData.animation_url = animation_url.toString()
                }
            }
        }

        if (jsonObject.isSet('image_sphere')) {
            let image_sphere: JSONValue | null = jsonObject.get('image_sphere');
            if (image_sphere) {
                let isNull: boolean = (image_sphere as JSONValue).isNull();
                if (!isNull) {
                    log.info("Setting image_sphere for {} ", [ipfsHash]);
                    metaData.image_sphere = image_sphere.toBool()
                }
            }
        }

        if (jsonObject.isSet('attributes')) {
            let attributes: JSONValue = jsonObject.get('attributes') as JSONValue;

            ///////////////////////////////
            // Artist, scarcity and tags //
            ///////////////////////////////

            if (isObject(attributes) && attributes.toObject().isSet('scarcity')) {
                // @ts-ignore
                metaData.scarcity = attributes.toObject().mustGet('scarcity').toString()
            }

            if (isObject(attributes) && attributes.toObject().isSet('artist')) {
                // @ts-ignore
                metaData.artist = attributes.toObject().mustGet('artist').toString()
            }

            if (isObject(attributes) && attributes.toObject().isSet('production_year')) {
                let rawProductionYear: JSONValue | null = attributes.toObject().get('production_year');
                let isNull: boolean = (rawProductionYear as JSONValue).isNull();
                if (rawProductionYear && !isNull) {
                    // @ts-ignore
                    metaData.production_year = rawProductionYear.toString()
                }
            }

            if (isObject(attributes) && attributes.toObject().isSet('format')) {
                let rawFormat: JSONValue | null = attributes.toObject().get('format');
                let isNull: boolean = (rawFormat as JSONValue).isNull();
                if (rawFormat && !isNull) {
                    // @ts-ignore
                    metaData.format = rawFormat.toString()
                }
            }

            if (isObject(attributes) && attributes.toObject().isSet('theme')) {
                let rawTheme: JSONValue | null = attributes.toObject().get('theme');
                let isNull: boolean = (rawTheme as JSONValue).isNull();
                if (rawTheme && !isNull) {
                    // @ts-ignore
                    metaData.theme = rawTheme.toString()
                }
            }

            if (isObject(attributes) && attributes.toObject().isSet('nsfw')) {
                let rawNsfw: JSONValue | null = attributes.toObject().get('nsfw');
                let isNull: boolean = (rawNsfw as JSONValue).isNull();
                if (rawNsfw && !isNull) {
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

            if (isObject(attributes) && attributes.toObject().isSet('cover_image_type')) {
                let coverImageType: JSONValue | null = attributes.toObject().get('cover_image_type');
                if (coverImageType) {
                    let isNull: boolean = (coverImageType as JSONValue).isNull();
                    if (!isNull) {
                        metaData.cover_image_type = coverImageType.toString()
                    }

                    // Set cover image to image if cover image is found
                    metaData.cover_image = metaData.image
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
        metaData.save()
    }
}

export function constructMetaData(editionNumber: string, tokenURI: string): MetaData {
    log.info("constructMetaData() for tokenURI [{}]", [tokenURI]);

    let ipfsParts: string[] = tokenURI.split('/')

    if (ipfsParts.length > 0) {
        let ipfsHash: string = ipfsParts[ipfsParts.length - 1];
        log.info("constructMetaData() token URI ipfsHash [{}]", [ipfsHash]);

        if (MAPPING_OVERRIDES.has(editionNumber)) {
            let override = MAPPING_OVERRIDES.get(editionNumber) as string;
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
        log.info('tokenUri', [tokenURI])
        const tokenIpfsHash = ipfsHash + '/' + tokenURI + '.json'
        log.info('tokenIpfsHash', [tokenIpfsHash])
        MetaDataTemplate.create(ipfsHash);

        MetaData.load(ipfsHash)



        return new MetaData(ipfsHash); // try and construct a object even if empty?
    } else {
        log.error("Unknown IPFS hash found for token URI {}", [tokenURI]);
    }
    return new MetaData("failed-ipfs-hash");
}

function isObject(jsonData: JSONValue): boolean {
    return jsonData.kind === JSONValueKind.OBJECT
}
