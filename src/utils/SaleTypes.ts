import {BigInt} from "@graphprotocol/graph-ts/index";

// V2 & V3
export const BUY_NOW = BigInt.fromI32(1);

// V2 only (legacy)
// Offers only will have a  max int price
export const BUY_NOW_AND_OFFERS = BigInt.fromI32(2);

// V2 & V3
export const OFFERS_ONLY = BigInt.fromI32(3);

// V3 only
export const STEPPED_SALE = BigInt.fromI32(4);

// V3 only
export const RESERVE_COUNTDOWN_AUCTION = BigInt.fromI32(5);

// V3 only
export const GATED_SALE_ONCHAIN = BigInt.fromI32(6);

// V3 only
export const GATED_SALE_SIGNATURE = BigInt.fromI32(7);
