import {Bytes} from "@graphprotocol/graph-ts/index";

export function createV4Id(contractAddress: string, editionOrTokenId: string): Bytes {
    return Bytes.fromUTF8(contractAddress.concat("-").concat(editionOrTokenId))
}