import {BigDecimal, BigInt, Address, Bytes} from "@graphprotocol/graph-ts/index";

export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000")
export const DEAD_ADDRESS = Address.fromString("0x000000000000000000000000000000000000dead");

export const ZERO_BIG_DECIMAL = BigDecimal.fromString("0")
export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)
export const MAX_UINT_256 = BigInt.fromUnsignedBytes(Bytes.fromHexString("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") as Bytes)

export const ONE_ETH = new BigDecimal(BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18)))
export const SECONDS_IN_DAY = BigInt.fromI32(86400)

export const CREATOR_CONTRACT = "CreatorContract";

export const WETH_ADDRESS_MAINNET = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
export const WETH_ADDRESS_GOERLI = "0xb4fbf271143f4fbf7b91a5ded31805e42b2208d6";

export function isWETHAddress(address: string): boolean {
  return address === WETH_ADDRESS_MAINNET || address === WETH_ADDRESS_GOERLI;
}