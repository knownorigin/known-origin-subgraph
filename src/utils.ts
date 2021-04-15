import {BigDecimal, BigInt,} from "@graphprotocol/graph-ts/index";
import {ONE_ETH} from "./constants";

export function toEther(value: BigInt): BigDecimal {
    return new BigDecimal(value) / ONE_ETH
}

export class ImageType {
    primaryAssetShortType: string;
    primaryAssetActualType: string;
}

export function splitMimeType(image_type: String): ImageType {
    let mimeTypes: string[] = image_type.split('/');
    let types = new ImageType()
    if (mimeTypes.length >= 1 as boolean) {
        types.primaryAssetShortType = mimeTypes[0];
    }
    if ((mimeTypes.length >= 2 as boolean)) {
        types.primaryAssetActualType = mimeTypes[1];
    }
    return types
}

export function toBigInt(integer: i32): BigInt {
    return BigInt.fromI32(integer)
}
