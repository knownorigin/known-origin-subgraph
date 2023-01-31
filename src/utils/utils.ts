import {BigDecimal, BigInt, Bytes} from "@graphprotocol/graph-ts/index";
import { isWETHAddress, ONE_ETH, ZERO } from "./constants";
import * as tokenService from "../services/Token.service";
import { ethereum } from "@graphprotocol/graph-ts";

export function toEther(value: BigInt): BigDecimal {
    // @ts-ignore
    return new BigDecimal(value) / ONE_ETH
}

export class ImageType {
    primaryAssetShortType: string | null;
    primaryAssetActualType: string | null;
    constructor() {
        this.primaryAssetShortType = null;
        this.primaryAssetShortType = null;
    }
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

// Finds and counts WETH trades as part of a transactions event logs
export function findWETHTradeValue(event: ethereum.Event): BigInt {
    let wethValueFound = ZERO;
    let receipt = event.receipt;
    if (receipt && receipt.logs.length > 0) {
        let eventLogs = receipt.logs;
        for (let index = 0; index < eventLogs.length; index++) {
            let eventLog = eventLogs[index];
            if (isWETHAddress(eventLog.address)) {
                wethValueFound = wethValueFound.plus(BigInt.fromUnsignedBytes(Bytes.fromUint8Array(eventLog.data)));
            }
        }
    }
    return wethValueFound;
}