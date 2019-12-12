import {BigDecimal, BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {ONE_ETH, SECONDS_IN_DAY} from "./constants";

export function toEther(value:BigInt): BigDecimal {
    return new BigDecimal(value) / ONE_ETH
}

export function dayNumberFromEvent(event: EthereumEvent): string {
    return event.block.timestamp.div(SECONDS_IN_DAY).toBigDecimal().truncate(0).toString()
}
