import {BigInt} from "@graphprotocol/graph-ts";

// 0: not transferred
// 1: transferred to dead address with no artworks minted
// 2: transferred to dead address with artworks minted
// 3: transferred to another active address

export let NOT_TRANSFERRED = BigInt.fromI32(0);
export let RENOUNCED_WITHOUT_ARTWORKS = BigInt.fromI32(1);
export let RENOUNCED_WITH_ARTWORKS = BigInt.fromI32(2);
export let TRANSFERRED_TO_ACTIVE_ADDRESS = BigInt.fromI32(3);