import { afterEach, clearStore, describe, newMockEvent, test } from "matchstick-as/assembly/index";
import { log } from "matchstick-as/assembly/log";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import { Transfer } from "../../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";
import { handleTransfer } from "../../../src/mappings/v4-creator-contracts/creator-contract";
import { handleSelfSovereignERC721Deployed } from "../../../src/mappings/v4-creator-contracts/factory";
import { assert, createMockedFunction, mockIpfsFile } from "matchstick-as";
import { SelfSovereignERC721Deployed } from "../../../generated/KnownOriginV4Factory/KnownOriginV4Factory";
import {
  ACTIVITY_ENTITY_TYPE,
  COLLECTOR_ENTITY_TYPE,
  CREATOR_CONTRACT_ENTITY_TYPE,
  DAY_ENTITY_TYPE,
  EDITION_ENTITY_TYPE,
  TOKEN_ENTITY_TYPE,
  TRANSFER_ENTITY_TYPE
} from "../entities";
import * as SaleTypes from "../../../src/utils/SaleTypes";
import { createV4Id } from "../../../src/mappings/v4-creator-contracts/KODAV4";
import {ActivityEvent} from "../../../generated/schema";

describe("KODA V4 tests", () => {

  afterEach(() => {
    clearStore();
  });

  test("Can handle Transfer event for KODA V4", () => {

    // const tokenId = BigInt.fromString("29039001");
    const from = "0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4";
    // const to = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

    const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
    const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
    const selfSovereignNFT = "0x5c6868b127b870e9f3d894150a51ff86c625f0f8";
    const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";
    const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

    const KODAV4_FACTORY = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");

    const event = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);
    event.address = KODAV4_FACTORY;

    const originalCreator = ethereum.Value.fromAddress(Address.fromString("0xD79C064fd1fBe2227B972de83E9fBB27dE8265bF"));
    const owner = ethereum.Value.fromAddress(Address.fromString(from));
    const size = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(20));
    const rawEditionId = BigInt.fromI32(29039000);
    const editionId = ethereum.Value.fromUnsignedBigInt(rawEditionId);
    const uri = ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");

    let defaultPercentage = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100000));

    createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
      .returns([
        defaultPercentage
      ]);

    createMockedFunction(Address.fromString(fundsHandler), "totalRecipients", "totalRecipients():(uint256)")
      .reverts();

    handleSelfSovereignERC721Deployed(event);

    assert.entityCount(CREATOR_CONTRACT_ENTITY_TYPE, 1);
    assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "implementation", implementation);
    assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "deployer", deployer);
    assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "creator", artist);
    assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "owner", artist);
    assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "minter", artist);
  });

  test("Can handle Transfer event for KODA V4", () => {

    ///////////////////////////
    // Setup Contract Object //
    ///////////////////////////

    const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
    const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
    const selfSovereignNFT = "0x5c6868b127b870e9f3d894150a51ff86c625f0f8";
    const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";
    const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

    const KODAV4_FACTORY = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
    const ssEvent = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);
    ssEvent.address = KODAV4_FACTORY;

    let defaultPercentage = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100000));

    createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
      .returns([
        defaultPercentage
      ]);

    createMockedFunction(Address.fromString(fundsHandler), "totalRecipients", "totalRecipients():(uint256)")
      .reverts();

    handleSelfSovereignERC721Deployed(ssEvent);

    //////////////////////////
    // Setup First Transfer //
    //////////////////////////

    const tokenId = BigInt.fromString("100001");
    const from = "0x3f8c962eb167ad2f80c72b5f933511ccdf0719d4";
    const to = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

    const event = createTransferEvent(to, from, tokenId);
    event.address = Address.fromString(selfSovereignNFT);
    event.transaction.value = BigInt.fromString("500000000000000000"); // 0.5 ETH

    const rawEditionId = BigInt.fromI32(100000);
    const editionId = ethereum.Value.fromUnsignedBigInt(rawEditionId);

    const originalCreator = ethereum.Value.fromAddress(Address.fromString("0xD79C064fd1fBe2227B972de83E9fBB27dE8265bF"));
    const size = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(20));
    const uri = ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");

    createMockedFunction(Address.fromString(selfSovereignNFT), "tokenEditionId", "tokenEditionId(uint256):(uint256)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        editionId
      ]);

    createMockedFunction(Address.fromString(selfSovereignNFT), "tokenEditionCreator", "tokenEditionCreator(uint256):(address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        originalCreator
      ]);

    createMockedFunction(Address.fromString(selfSovereignNFT), "editionSize", "editionSize(uint256):(uint256)")
      .withArgs([editionId])
      .returns([
        size
      ]);

    createMockedFunction(Address.fromString(selfSovereignNFT), "editionURI", "editionURI(uint256):(string)")
      .withArgs([editionId])
      .returns([
        uri
      ]);

    mockIpfsFile("QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm", "tests/ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm.json");

    createMockedFunction(Address.fromString(selfSovereignNFT), "isOpenEdition", "isOpenEdition(uint256):(bool)")
      .withArgs([editionId])
      .returns([
        ethereum.Value.fromBoolean(false)
      ]);

    createMockedFunction(Address.fromString(selfSovereignNFT), "owner", "owner():(address)")
      .returns([
        originalCreator
      ]);

    createMockedFunction(Address.fromString(selfSovereignNFT), "ownerOf", "ownerOf(uint256):(address)")
      .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
      .returns([
        ethereum.Value.fromAddress(Address.fromString(to))
      ]);

    // Handle the transfer event
    handleTransfer(event);

    // Assert entities created
    const generatedEditionId = createV4Id(selfSovereignNFT, rawEditionId.toString());
    assert.entityCount(EDITION_ENTITY_TYPE, 1);
    assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "version", "4");
    assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "artistAccount", "0xd79c064fd1fbe2227b972de83e9fbb27de8265bf");
    assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "tokenURI", "ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");
    assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "active", "true");

    assert.entityCount(COLLECTOR_ENTITY_TYPE, 2);
    assert.fieldEquals(COLLECTOR_ENTITY_TYPE, from, "address", from);
    assert.fieldEquals(COLLECTOR_ENTITY_TYPE, to, "address", to);

    const generatedTokenId = createV4Id(selfSovereignNFT, tokenId.toString());
    assert.entityCount(TOKEN_ENTITY_TYPE, 1);
    assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "editionNumber", rawEditionId.toString());
    assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "version", "4");
    assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "salesType", SaleTypes.OFFERS_ONLY.toString());
    assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "transferCount", "1");

    assert.entityCount(TRANSFER_ENTITY_TYPE, 1);
    assert.entityCount(DAY_ENTITY_TYPE, 1);
    assert.entityCount(ACTIVITY_ENTITY_TYPE, 2);
  });
  test('Contract Deployment ActivityEvent correctly produced',() =>{
    const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
    const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
    const selfSovereignNFT = "0x5c6868b127b870e9f3d894150a51ff86c625f0f8";
    const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";
    const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

    const KODAV4_FACTORY = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
    const ssEvent = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);
    ssEvent.address = KODAV4_FACTORY;

    let defaultPercentage = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100000));

    createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
        .returns([
          defaultPercentage
        ]);

    createMockedFunction(Address.fromString(fundsHandler), "totalRecipients", "totalRecipients():(uint256)")
        .reverts();
    // return this mocked value
    let mockedActivityEventId = ethereum.Value.fromString("CreatorContract-0x03c839988b379b1c87ea26f72dd37499aa6d947f-DEPLOYMENT-0xe49401d534aa54a06f698f083205e7d9298726d32992fc6f73adcbcb5df41200-322");

    createMockedFunction(KODAV4_FACTORY, "createCreatorContractEventId", "createCreatorContractEventId():(string)")
        .returns([mockedActivityEventId]);
    handleSelfSovereignERC721Deployed(ssEvent);

    assert.fieldEquals(ACTIVITY_ENTITY_TYPE, mockedActivityEventId.toString(), "eventType", 'CreatorContractDeployed')
    assert.entityCount(ACTIVITY_ENTITY_TYPE, 1)
  })
});

export function createTransferEvent(to: string, from: string, tokenId: BigInt): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent());
  transferEvent.parameters = new Array();
  transferEvent.parameters.push(new ethereum.EventParam("to", ethereum.Value.fromAddress(Address.fromString(to))));
  transferEvent.parameters.push(new ethereum.EventParam("from", ethereum.Value.fromAddress(Address.fromString(from))));
  transferEvent.parameters.push(new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)));
  return transferEvent;
}

export function createSelfSovereignERC721DeployedEvent(
  deployer: string,
  artist: string,
  selfSovereignNFT: string,
  implementation: string,
  fundsHandler: string
): SelfSovereignERC721Deployed {
  let transferEvent = changetype<SelfSovereignERC721Deployed>(newMockEvent());
  transferEvent.parameters = new Array();
  transferEvent.parameters.push(new ethereum.EventParam("deployer", ethereum.Value.fromAddress(Address.fromString(deployer))));
  transferEvent.parameters.push(new ethereum.EventParam("artist", ethereum.Value.fromAddress(Address.fromString(artist))));
  transferEvent.parameters.push(new ethereum.EventParam("selfSovereignNFT", ethereum.Value.fromAddress(Address.fromString(selfSovereignNFT))));
  transferEvent.parameters.push(new ethereum.EventParam("implementation", ethereum.Value.fromAddress(Address.fromString(implementation))));
  transferEvent.parameters.push(new ethereum.EventParam("fundsHandler", ethereum.Value.fromAddress(Address.fromString(fundsHandler))));
  return transferEvent;
}
