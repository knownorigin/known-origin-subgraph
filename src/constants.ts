import {BigDecimal, BigInt} from "@graphprotocol/graph-ts/index";

export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)

export const ONE_ETH = new BigDecimal(BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18)))
export const SECONDS_IN_DAY = BigInt.fromI32(86400)

