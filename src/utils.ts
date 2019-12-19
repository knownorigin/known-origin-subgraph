import {BigDecimal, BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {ONE_ETH, SECONDS_IN_DAY, ZERO, ONE} from "./constants";

export function toEther(value: BigInt): BigDecimal {
    return new BigDecimal(value) / ONE_ETH
}