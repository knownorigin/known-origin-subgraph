import {BigInt} from "@graphprotocol/graph-ts/index";

export function toBigInt(integer): BigInt {
    return BigInt.fromI32(integer)
}