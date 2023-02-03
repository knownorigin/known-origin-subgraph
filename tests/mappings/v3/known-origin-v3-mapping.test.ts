import { afterEach, clearStore, describe, mockIpfsFile, newMockEvent, test } from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Transfer } from "../../../generated/KnownOriginV3/KnownOriginV3";
import { handleTransfer } from "../../../src/mappings/v3/known-origin-v3-mapping";
import { assert, createMockedFunction } from "matchstick-as";
import { WETH_ADDRESS_MAINNET, ZERO, ZERO_ADDRESS } from "../../../src/utils/constants";
import {
  ACTIVITY_ENTITY_TYPE,
  COLLECTOR_ENTITY_TYPE,
  DAY_ENTITY_TYPE,
  EDITION_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE,
  TRANSFER_ENTITY_TYPE
} from "../entities";
import * as SaleTypes from "../../../src/utils/SaleTypes";
import { Bytes } from "@graphprotocol/graph-ts/common/collections";

describe("KODA V3 tests", () => {

  afterEach(() => {
    clearStore();
  });

  test("Can handle Transfer event for KODA V3", () => {

    const tokenId = BigInt.fromString("29039001");
    const from = "0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4";
    const to = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

    const event = createTransferEvent(to, from, tokenId);
    event.transaction.value = BigInt.fromString("500000000000000000"); // 0.5 ETH

    const KODAV3 = Address.fromString("0xA16081F360e3847006dB660bae1c6d1b2e17eC2A");

    const originalCreator = ethereum.Value.fromAddress(Address.fromString("0xD79C064fd1fBe2227B972de83E9fBB27dE8265bF"));
    const owner = ethereum.Value.fromAddress(Address.fromString(from));
    const size = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(20));
    const rawEditionId = BigInt.fromI32(29039000);
    const editionId = ethereum.Value.fromUnsignedBigInt(rawEditionId);
    const uri = ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");

    // Mock contract calls

    createMockedFunction(KODAV3, "getEditionDetails", "getEditionDetails(uint256):(address,address,uint16,uint256,string)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        originalCreator,
        owner,
        size,
        editionId,
        uri
      ]);

    createMockedFunction(KODAV3, "getEditionIdOfToken", "getEditionIdOfToken(uint256):(uint256)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        editionId
      ]);

    createMockedFunction(KODAV3, "tokenURI", "tokenURI(uint256):(string)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        uri
      ]);

    createMockedFunction(KODAV3, "editionURI", "editionURI(uint256):(string)")
      .withArgs([editionId])
      .returns([
        uri
      ]);

    createMockedFunction(KODAV3, "ownerOf", "ownerOf(uint256):(address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        owner
      ]);

    createMockedFunction(KODAV3, "reportedEditionIds", "reportedEditionIds(uint256):(bool)")
      .withArgs([editionId])
      .returns([
        ethereum.Value.fromBoolean(false)
      ]);

    createMockedFunction(KODAV3, "reportedArtistAccounts", "reportedArtistAccounts(address):(bool)")
      .withArgs([originalCreator])
      .returns([
        ethereum.Value.fromBoolean(false)
      ]);

    createMockedFunction(KODAV3, "getApproved", "getApproved(uint256):(address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        ethereum.Value.fromAddress(ZERO_ADDRESS)
      ]);

    createMockedFunction(KODAV3, "getCreatorOfEdition", "getCreatorOfEdition(uint256):(address)")
      .withArgs([editionId])
      .returns([
        originalCreator
      ]);

    createMockedFunction(KODAV3, "getSizeOfEdition", "getSizeOfEdition(uint256):(uint256)")
      .withArgs([editionId])
      .returns([
        size
      ]);

    mockIpfsFile("QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm", "tests/ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm.json");

    // Run the actual test event
    handleTransfer(event);

    // Assert entities created
    assert.entityCount(EDITION_ENTITY_TYPE, 1);
    assert.fieldEquals(EDITION_ENTITY_TYPE, rawEditionId.toString(), "version", "3");
    assert.fieldEquals(EDITION_ENTITY_TYPE, rawEditionId.toString(), "artistAccount", "0xd79c064fd1fbe2227b972de83e9fbb27de8265bf");
    assert.fieldEquals(EDITION_ENTITY_TYPE, rawEditionId.toString(), "tokenURI", "ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");
    assert.fieldEquals(EDITION_ENTITY_TYPE, rawEditionId.toString(), "active", "true");

    assert.entityCount(COLLECTOR_ENTITY_TYPE, 2);
    assert.fieldEquals(COLLECTOR_ENTITY_TYPE, from, "address", from);
    assert.fieldEquals(COLLECTOR_ENTITY_TYPE, to, "address", to);

    assert.entityCount(TOKEN_ENTITY_TYPE, 1);
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "editionNumber", rawEditionId.toString());
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "version", "3");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "salesType", SaleTypes.OFFERS_ONLY.toString());
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "transferCount", "1");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "totalPurchaseCount", "1");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "totalPurchaseValue", "0.5");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "primaryValueInEth", "0.5");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "largestSalePriceEth", "0.5");

    assert.entityCount(TRANSFER_ENTITY_TYPE, 1);
    assert.entityCount(DAY_ENTITY_TYPE, 1);
    assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
  });

  test("Can handle WETH trade off-platform", () => {
    const tokenId = BigInt.fromString("29039001");
    const from = "0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4";
    const to = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

    // Create event with WETH attached to the tops
    const event = createTransferEvent(to, from, tokenId);
    event.transaction.value = BigInt.fromString("0");
    (event.receipt as ethereum.TransactionReceipt).logs[0].address = WETH_ADDRESS_MAINNET;
    const KODAV3 = Address.fromString("0xA16081F360e3847006dB660bae1c6d1b2e17eC2A");

    (event.receipt as ethereum.TransactionReceipt).logs[0].data = Bytes.fromHexString("0x000000000000000000000000000000000000000000000000067c01663f4d2000");

    const originalCreator = ethereum.Value.fromAddress(Address.fromString("0xD79C064fd1fBe2227B972de83E9fBB27dE8265bF"));
    const owner = ethereum.Value.fromAddress(Address.fromString(from));
    const size = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(20));
    const rawEditionId = BigInt.fromI32(29039000);
    const editionId = ethereum.Value.fromUnsignedBigInt(rawEditionId);
    const uri = ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");

    // Mock contract calls

    createMockedFunction(KODAV3, "getEditionDetails", "getEditionDetails(uint256):(address,address,uint16,uint256,string)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        originalCreator,
        owner,
        size,
        editionId,
        uri
      ]);

    createMockedFunction(KODAV3, "getEditionIdOfToken", "getEditionIdOfToken(uint256):(uint256)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        editionId
      ]);

    createMockedFunction(KODAV3, "tokenURI", "tokenURI(uint256):(string)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        uri
      ]);

    createMockedFunction(KODAV3, "editionURI", "editionURI(uint256):(string)")
      .withArgs([editionId])
      .returns([
        uri
      ]);

    createMockedFunction(KODAV3, "ownerOf", "ownerOf(uint256):(address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        owner
      ]);

    createMockedFunction(KODAV3, "reportedEditionIds", "reportedEditionIds(uint256):(bool)")
      .withArgs([editionId])
      .returns([
        ethereum.Value.fromBoolean(false)
      ]);

    createMockedFunction(KODAV3, "reportedArtistAccounts", "reportedArtistAccounts(address):(bool)")
      .withArgs([originalCreator])
      .returns([
        ethereum.Value.fromBoolean(false)
      ]);

    createMockedFunction(KODAV3, "getApproved", "getApproved(uint256):(address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        ethereum.Value.fromAddress(ZERO_ADDRESS)
      ]);

    createMockedFunction(KODAV3, "getCreatorOfEdition", "getCreatorOfEdition(uint256):(address)")
      .withArgs([editionId])
      .returns([
        originalCreator
      ]);

    createMockedFunction(KODAV3, "getSizeOfEdition", "getSizeOfEdition(uint256):(uint256)")
      .withArgs([editionId])
      .returns([
        size
      ]);

    mockIpfsFile("QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm", "tests/ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm.json");

    // Run the actual test event
    handleTransfer(event);

    assert.entityCount(TOKEN_ENTITY_TYPE, 1);
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "editionNumber", rawEditionId.toString());
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "version", "3");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "salesType", SaleTypes.OFFERS_ONLY.toString());
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "transferCount", "1");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "totalPurchaseCount", "1");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "totalPurchaseValue", "0.46725");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "primaryValueInEth", "0.46725");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, tokenId.toString(), "largestSalePriceEth", "0.46725");

  });
});

export function createTransferEvent(to: string, from: string, tokenId: BigInt): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent());
  transferEvent.parameters = new Array();
  transferEvent.parameters.push(new ethereum.EventParam("to", ethereum.Value.fromAddress(Address.fromString(to))));
  transferEvent.parameters.push(new ethereum.EventParam("from", ethereum.Value.fromAddress(Address.fromString(from))));
  transferEvent.parameters.push(new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)));
  return transferEvent;
}