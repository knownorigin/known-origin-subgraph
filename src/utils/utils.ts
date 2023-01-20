import {BigDecimal, BigInt, Bytes} from "@graphprotocol/graph-ts/index";
import {ONE_ETH} from "./constants";

export function toEther(value: BigInt): BigDecimal {
    // @ts-ignore
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

// @ts-ignore
export function toBigInt(integer: i32): BigInt {
    return BigInt.fromI32(integer)
}

export function toLowerCase(input: String): string {
    let lowerString: string = ""
    for(let i = 0; i < input.length; i++) {
        // @ts-ignore
        let inputCharAtIndex: i32 = input.charCodeAt(i)

        // @ts-ignore
        let lowercaseChar: i32
        // A is char code 65 and Z is 90. If the char code is in this range, add 32 to make it lower case
        if (inputCharAtIndex >= 65 && inputCharAtIndex <= 90) {
            lowercaseChar = inputCharAtIndex + 32
        } else {
            lowercaseChar = inputCharAtIndex
        }

        lowerString = lowerString.concat(String.fromCharCode(lowercaseChar))
    }

    return lowerString
}

export function convertByteStringToHexAddress(byteString: Bytes): string {
    return "0x" + byteString.toHexString().slice(-40);
}