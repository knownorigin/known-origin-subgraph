import {
  afterEach,
  assert,
  clearStore,
  createMockedFunction,
  describe,
  newMockEvent,
  test
} from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { PurchasedWithEther } from "../../../generated/KnownOriginV1/KnownOriginV1";
import { handlePurchase } from "../../../src/mappings/v1/known-origin-v1-mapping";
import { ZERO } from "../../../src/utils/constants";
import { createDayId } from "../../../src/services/Day.service";
import { ARTIST_ENTITY_TYPE, COLLECTOR_ENTITY_TYPE, DAY_ENTITY_TYPE } from "../entities";

describe("KODA V1 tests", () => {

  afterEach(() => {
    clearStore();
  });

  test("Can handle PurchasedWithEther KODA V1 Event", () => {
    const buyer = Address.fromString("0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7");
    const KODAV1 = Address.fromString("0xA16081F360e3847006dB660bae1c6d1b2e17eC2A");
    const artist = Address.fromString("0x3f8C962eb167aD2f80C72b5F933511CcDF0719D4");

    const event = createPurchasedWithEtherEvent(BigInt.fromString("1000"), buyer.toHexString());
    event.transaction.value = BigInt.fromString("500000000000000000"); // 0.5 ETH

    // Mock contract call
    createMockedFunction(KODAV1, "editionInfo", "editionInfo(uint256):(uint256,bytes16,uint256,string,address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromString("1000"))])
      .returns([
        ethereum.Value.fromUnsignedBigInt(ZERO),
        ethereum.Value.fromBytes(Bytes.fromI32(0)),
        ethereum.Value.fromUnsignedBigInt(ZERO),
        ethereum.Value.fromString(""),
        ethereum.Value.fromAddress(artist)
      ]);

    // Run the test
    handlePurchase(event);

    // Check artist data
    assert.entityCount(ARTIST_ENTITY_TYPE, 1);
    assert.fieldEquals(ARTIST_ENTITY_TYPE, artist.toHexString(), "highestSaleToken", "1000");
    assert.fieldEquals(ARTIST_ENTITY_TYPE, artist.toHexString(), "highestSaleValueInEth", "0.5");

    // Check day data
    assert.entityCount(DAY_ENTITY_TYPE, 1);
    assert.fieldEquals(DAY_ENTITY_TYPE, createDayId(event), "totalValueInEth", "0.5");

    // Check collector data
    assert.entityCount(COLLECTOR_ENTITY_TYPE, 1);
    assert.fieldEquals(COLLECTOR_ENTITY_TYPE, buyer.toHexString(), "primaryPurchaseCount", "1");
    assert.fieldEquals(COLLECTOR_ENTITY_TYPE, buyer.toHexString(), "primaryPurchaseEthSpent", "0.5");
  });
});

export function createPurchasedWithEtherEvent(tokenId: BigInt, buyer: string): PurchasedWithEther {
  let newPurchasedWithEtherEvent = changetype<PurchasedWithEther>(newMockEvent());
  newPurchasedWithEtherEvent.parameters = new Array();

  let tokenIdParam = new ethereum.EventParam("_tokenId", ethereum.Value.fromUnsignedBigInt(tokenId));
  let buyerParam = new ethereum.EventParam("_buyer", ethereum.Value.fromAddress(Address.fromString(buyer)));

  newPurchasedWithEtherEvent.parameters.push(tokenIdParam);
  newPurchasedWithEtherEvent.parameters.push(buyerParam);

  return newPurchasedWithEtherEvent;
}
