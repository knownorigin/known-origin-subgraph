import {afterEach, assert, clearStore, createMockedFunction, describe, mockIpfsFile, test} from "matchstick-as";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {
    handleCreatorContractBanned,
    handleSelfSovereignERC721Deployed
} from "../../../src/mappings/v4-creator-contracts/factory";
import {
    createSelfSovereignERC721DeployedEvent,
    createCreatorContractBannedEvent,
    createListedEditionForBuyNowEvent
} from "../mockingFunctions";

import {ACTIVITY_ENTITY_TYPE, CREATOR_CONTRACT_ENTITY_TYPE, EDITION_ENTITY_TYPE} from "../entities";
import {handleListedForBuyItNow} from "../../../src/mappings/v4-creator-contracts/creator-contract";
import {createV4Id} from "../../../src/mappings/v4-creator-contracts/KODAV4";


describe("KODA V4 Factory tests", () => {

    afterEach(() => {
        clearStore();
    });

    describe("Contract creation tests", () => {

        test("Can correctly deploy a contract", () => {
            const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
            const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
            const selfSovereignNFT = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
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

            createMockedFunction(Address.fromString(selfSovereignNFT), "name", "name():(string)")
                .returns([
                    ethereum.Value.fromString("test contract")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "symbol", "symbol():(string)")
                .returns([
                    ethereum.Value.fromString("TEST")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "operatorFilterRegistry", "operatorFilterRegistry():(address)")
                .returns([
                    ethereum.Value.fromAddress(Address.fromString("0xf436269d6b7b9e8a76e6fb80c0a49681d4278747"))
                ]);

            createMockedFunction(Address.fromString(fundsHandler), "totalRecipients", "totalRecipients():(uint256)")
                .reverts();

            handleSelfSovereignERC721Deployed(ssEvent);

            assert.entityCount(CREATOR_CONTRACT_ENTITY_TYPE, 1);
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "eventAddress", KODAV4_FACTORY.toHexString())
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "implementation", implementation)
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "deployer", deployer)
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "creator", artist)
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "owner", artist)
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "minter", artist)
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "isHidden", 'false')
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "secondaryRoyaltyPercentage", '100000')

            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "name", 'test contract')
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "symbol", 'TEST')
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "filterRegistry", '0xf436269d6b7b9e8a76e6fb80c0a49681d4278747')

            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "transferState", '0');

            assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
        })

        test("Can handle Contract Creation event for KODA V4", () => {
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

            createMockedFunction(Address.fromString(selfSovereignNFT), "name", "name():(string)")
                .returns([
                    ethereum.Value.fromString("test contract")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "symbol", "symbol():(string)")
                .returns([
                    ethereum.Value.fromString("TEST")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "operatorFilterRegistry", "operatorFilterRegistry():(address)")
                .returns([
                    ethereum.Value.fromAddress(Address.fromString("0xf436269D6b7B9E8A76e6FB80C0a49681d4278747"))
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
    })

    describe('Banning a contract tests', () => {
        test('Can successfully ban a contract', () => {
            ///////////////////////////
            // Setup Contract Object //
            ///////////////////////////
            const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
            const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
            const selfSovereignNFT = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
            const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";
            const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

            const KODAV4_FACTORY = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
            const ssEvent = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);
            ssEvent.address = KODAV4_FACTORY;

            handleSelfSovereignERC721Deployed(ssEvent);

            assert.entityCount(CREATOR_CONTRACT_ENTITY_TYPE, 1);

            const bannedEventTrue = createCreatorContractBannedEvent(selfSovereignNFT, true)
            handleCreatorContractBanned(bannedEventTrue)

            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "isHidden", 'true');

            const bannedEventFalse = createCreatorContractBannedEvent(selfSovereignNFT, false)
            handleCreatorContractBanned(bannedEventFalse)

            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "isHidden", 'false');

        })

        test('Can ban a contract and its relevant edition', () => {
            ///////////////////////////
            // Setup Contract Object //
            ///////////////////////////

            const deployer = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
            const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";
            const selfSovereignNFT = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
            const implementation = "0x34775b52d205d83f9ed3dfa115be51f84e24c3f7";
            const fundsHandler = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

            const KODAV4_FACTORY = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
            const ssEvent = createSelfSovereignERC721DeployedEvent(deployer, artist, selfSovereignNFT, implementation, fundsHandler);
            ssEvent.address = KODAV4_FACTORY;

            let defaultPercentage = ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(100000));

            mockIpfsFile("QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm", "tests/ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm.json");

            createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
                .returns([
                    defaultPercentage
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "name", "name():(string)")
                .returns([
                    ethereum.Value.fromString("test contract")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "symbol", "symbol():(string)")
                .returns([
                    ethereum.Value.fromString("TEST")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "operatorFilterRegistry", "operatorFilterRegistry():(address)")
                .returns([
                    ethereum.Value.fromAddress(Address.fromString("0xf436269D6b7B9E8A76e6FB80C0a49681d4278747"))
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "isHidden", "isHidden():(bool)")
                .returns([
                    ethereum.Value.fromBoolean(false)
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "editionSize", "editionSize(uint256):(uint256)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(50))
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "editionURI", "editionURI(uint256):(string)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm")
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "isOpenEdition", "isOpenEdition(uint256):(bool)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromBoolean(true)
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "editionCreator", "editionCreator(uint256):(address)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromAddress(Address.fromString(deployer))
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "editionListing", "editionListing(uint256):(uint128,uint128,uint128)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromUnsignedBigInt(BigInt.fromString("100000000000000000")), ethereum.Value.fromUnsignedBigInt(BigInt.fromString("1674732534")), ethereum.Value.fromUnsignedBigInt(BigInt.fromString("1684732534"))
                ]);

            createMockedFunction(Address.fromString(fundsHandler), "totalRecipients", "totalRecipients():(uint256)")
                .reverts();

            handleSelfSovereignERC721Deployed(ssEvent);

            ////////////////////////
            // Mint edition ///
            ////////////////////////

            const editionId = BigInt.fromI32(200000);
            const listingPrice = BigInt.fromString("100000000000000000");
            const startingDate = BigInt.fromString("1674732534")

            const listingEvent = createListedEditionForBuyNowEvent(editionId, listingPrice, startingDate)
            listingEvent.address = Address.fromString(selfSovereignNFT)

            handleListedForBuyItNow(listingEvent)

            // Assert entities created
            const generatedEditionId = createV4Id(selfSovereignNFT, editionId.toString());

            assert.entityCount(CREATOR_CONTRACT_ENTITY_TYPE, 1);
            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "isHidden", 'false');

            assert.entityCount(EDITION_ENTITY_TYPE, 1);
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "version", "4");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "active", "true");

            assert.entityCount(ACTIVITY_ENTITY_TYPE, 3);

            const bannedEventTrue = createCreatorContractBannedEvent(selfSovereignNFT, true)
            handleCreatorContractBanned(bannedEventTrue)

            assert.fieldEquals(CREATOR_CONTRACT_ENTITY_TYPE, selfSovereignNFT, "isHidden", 'true');
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "active", "false");
        })
    })

})