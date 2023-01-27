import {afterEach, clearStore, describe, newMockEvent, test} from "matchstick-as/assembly/index";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {
    Transfer,
    ListedEditionForBuyNow,
    EditionFundsHandlerUpdated
} from "../../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";
import {RoyaltyRecipientCreated} from "../../../generated/KODAV3CollabRegistry/KODAV3CollabRegistry";
import {
    handleTransfer,
    handleEditionLevelFundSplitterSet
} from "../../../src/mappings/v4-creator-contracts/creator-contract";
import {handleSelfSovereignERC721Deployed} from "../../../src/mappings/v4-creator-contracts/factory";
import {assert, createMockedFunction, mockIpfsFile} from "matchstick-as";
import {SelfSovereignERC721Deployed} from "../../../generated/KnownOriginV4Factory/KnownOriginV4Factory";
import {
    ACTIVITY_ENTITY_TYPE,
    COLLECTIVE_ENTITY_TYPE,
    COLLECTOR_ENTITY_TYPE,
    CREATOR_CONTRACT_ENTITY_TYPE,
    DAY_ENTITY_TYPE,
    EDITION_ENTITY_TYPE,
    TOKEN_ENTITY_TYPE,
    TRANSFER_ENTITY_TYPE
} from "../entities";
import * as SaleTypes from "../../../src/utils/SaleTypes";
import {createV4Id} from "../../../src/mappings/v4-creator-contracts/KODAV4";
import {handleRoyaltyRecipientCreated} from "../../../src/mappings/v3/known-origin-v3-collab-registry-mapping";
import { FundsHandler__shareAtIndexResult } from "../../../generated/KnownOriginV4Factory/FundsHandler";

describe("KODA V4 tests", () => {

    afterEach(() => {
        clearStore();
    });

    test("Can setup a newly deployed self sovereign contract", () => {

        const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
        const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
        const selfSovereignNFT = "0x5c6868b127b870e9f3d894150a51ff86c625f0f8";
        const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";
        const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

        const KODAV4_FACTORY = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");

        const event = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);
        event.address = KODAV4_FACTORY;

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

    test("Can handle Transfer event for KODA V4 creator contract", () => {

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

    test('Can handle a V4 for mint with collabs', () => {

        ///////////////////////////
        // Setup Collab Creation //
        ///////////////////////////
        const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
        const collabRegistry = "0x9c8251b1ebe4ac89cd993911d6f319368004b669";

        const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

        const recipients = ["0x681A7040477Be268A4b9A02c5e8263fd9fEbf0a9", "0xeeb2bc6f52deda185181fc2c310222837440cacd"]
        const splits = [BigInt.fromI32(500000), BigInt.fromI32(500000)]

        const collabEvent = createRoyaltyRecipientCreatedEvent(deployer, collabRegistry, fundsHandler, recipients, splits)
        collabEvent.address = Address.fromString(deployer);

        handleRoyaltyRecipientCreated(collabEvent)

        assert.fieldEquals(COLLECTIVE_ENTITY_TYPE, collabEvent.address.toHexString(), "isDeployed", "true");
        assert.fieldEquals(COLLECTIVE_ENTITY_TYPE, collabEvent.address.toHexString(), "recipients", "[0x681a7040477be268a4b9a02c5e8263fd9febf0a9, 0xeeb2bc6f52deda185181fc2c310222837440cacd]");
        assert.fieldEquals(COLLECTIVE_ENTITY_TYPE, collabEvent.address.toHexString(), "splits", "[500000, 500000]");
        assert.fieldEquals(COLLECTIVE_ENTITY_TYPE, collabEvent.address.toHexString(), "creator", fundsHandler);
        assert.fieldEquals(COLLECTIVE_ENTITY_TYPE, collabEvent.address.toHexString(), "baseHandler", collabRegistry);

        ///////////////////////////
        // Setup Contract Object //
        ///////////////////////////

        const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
        const selfSovereignNFT = "0x5c6868b127b870e9f3d894150a51ff86c625f0f8";
        const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";

        const ssEvent = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);

        let defaultPercentage = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100000));

        createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
            .returns([
                defaultPercentage
            ]);

        createMockedFunction(Address.fromString(fundsHandler), "totalRecipients", "totalRecipients():(uint256)")
            .returns([
              ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(2))
            ]);

        createMockedFunction(Address.fromString(fundsHandler), "shareAtIndex", "shareAtIndex(uint256):(address,uint256)")
            .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(0))])
            .returns([
                ethereum.Value.fromAddress(Address.fromString(recipients[0])),
                ethereum.Value.fromUnsignedBigInt(splits[0])
            ]);

        createMockedFunction(Address.fromString(fundsHandler), "shareAtIndex", "shareAtIndex(uint256):(address,uint256)")
            .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1))])
            .returns([
                ethereum.Value.fromAddress(Address.fromString(recipients[1])),
                ethereum.Value.fromUnsignedBigInt(splits[1])
            ]);

        handleSelfSovereignERC721Deployed(ssEvent);

        assert.entityCount(CREATOR_CONTRACT_ENTITY_TYPE, 1);
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "implementation", implementation);
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "deployer", deployer);
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "creator", artist);
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "owner", artist);
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "minter", artist);
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "defaultFundsRecipients", "[0x681a7040477be268a4b9a02c5e8263fd9febf0a9, 0xeeb2bc6f52deda185181fc2c310222837440cacd]");
        assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "defaultFundsShares", "[500000, 500000]");
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

export function createMintWithCollabEvent(editionId: BigInt, handler: string): EditionFundsHandlerUpdated {
    let event = changetype<EditionFundsHandlerUpdated>(newMockEvent())
    event.parameters = new Array();
    event.parameters.push(new ethereum.EventParam("editionId", ethereum.Value.fromUnsignedBigInt(editionId)))
    event.parameters.push(new ethereum.EventParam("handler", ethereum.Value.fromAddress(Address.fromString(handler))))
    return event
}

export function createRoyaltyRecipientCreatedEvent(creator: string, handler: string, deployedHandler: string, recipients: string[], splits: BigInt[]): RoyaltyRecipientCreated {
    let event = changetype<RoyaltyRecipientCreated>(newMockEvent())
    event.parameters = new Array();
    event.parameters.push(new ethereum.EventParam("creator", ethereum.Value.fromAddress(Address.fromString(creator))))
    event.parameters.push(new ethereum.EventParam("handler", ethereum.Value.fromAddress(Address.fromString(handler))))
    event.parameters.push(new ethereum.EventParam("deployedHandler", ethereum.Value.fromAddress(Address.fromString(deployedHandler))))

    const values:Address[] = recipients.map<Address>((recipient: string): Address => {
        return Address.fromString(recipient)
    });
    event.parameters.push(new ethereum.EventParam("recipients", ethereum.Value.fromAddressArray(values)))
    event.parameters.push(new ethereum.EventParam("splits", ethereum.Value.fromUnsignedBigIntArray(splits)))
    return event
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
