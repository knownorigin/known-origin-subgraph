import {BigDecimal, BigInt,} from "@graphprotocol/graph-ts/index";
import {ONE_ETH} from "./constants";

export function toEther(value: BigInt): BigDecimal {
    return new BigDecimal(value) / ONE_ETH
}
