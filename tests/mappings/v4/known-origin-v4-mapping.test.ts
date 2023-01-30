import {afterEach, clearStore, describe, newMockEvent, test} from "matchstick-as/assembly/index";
import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts";
import {
    ListedEditionForBuyNow,
    Transfer,
    BuyNowPurchased
} from "../../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";
import {
    handleBuyNowPurchased,
    handleListedForBuyItNow,
    handleTransfer
} from "../../../src/mappings/v4-creator-contracts/creator-contract";
import {handleSelfSovereignERC721Deployed} from "../../../src/mappings/v4-creator-contracts/factory";
import {assert, createMockedFunction, mockIpfsFile} from "matchstick-as";
import {SelfSovereignERC721Deployed} from "../../../generated/KnownOriginV4Factory/KnownOriginV4Factory";
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
import {createV4Id} from "../../../src/mappings/v4-creator-contracts/KODAV4";
import {ZERO_ADDRESS} from "../../../src/utils/constants";
import {PlatformPrimaryCommissionUpdated} from "../../../generated/KODASettings/KODASettings";
import {CreatorContractSetting} from "../../../generated/schema";

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


    describe('Open edition tests', () => {
        test('Can mint an open edition', () => {
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
            const uri = ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");

            createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
                .returns([
                    defaultPercentage
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "isHidden", "isHidden():(bool)")
                .returns([
                    ethereum.Value.fromBoolean(false)
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "editionSize", "editionSize(uint256):(uint256)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(10000))
                ]);


            createMockedFunction(Address.fromString(selfSovereignNFT), "editionURI", "editionURI(uint256):(string)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    uri
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
            // Mint open edition ///
            ////////////////////////

            const editionId = BigInt.fromI32(200000);
            const listingPrice = BigInt.fromString("100000000000000000");
            const startingDate = BigInt.fromString("1674732534")

            const listingEvent = createListedEditionForBuyNowEvent(editionId, listingPrice, startingDate)
            listingEvent.address = Address.fromString(selfSovereignNFT)

            handleListedForBuyItNow(listingEvent)

            // Assert entities created
            const generatedEditionId = createV4Id(selfSovereignNFT, editionId.toString());
            assert.entityCount(EDITION_ENTITY_TYPE, 1);
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "version", "4");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "salesType", "6");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "artistAccount", artist);
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "tokenURI", "ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "active", "true");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "isOpenEdition", "true");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "priceInWei", "100000000000000000");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "startDate", "1674732534");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "endDate", "1684732534");

            assert.entityCount(ACTIVITY_ENTITY_TYPE, 2);
        })

        test('Can purchase an open edition', () => {
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
            const uri = ethereum.Value.fromString("ipfs://ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm");

            createMockedFunction(Address.fromString(selfSovereignNFT), "defaultRoyaltyPercentage", "defaultRoyaltyPercentage():(uint256)")
                .returns([
                    defaultPercentage
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "isHidden", "isHidden():(bool)")
                .returns([
                    ethereum.Value.fromBoolean(false)
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "editionSize", "editionSize(uint256):(uint256)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(10000))
                ]);


            createMockedFunction(Address.fromString(selfSovereignNFT), "editionURI", "editionURI(uint256):(string)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))])
                .returns([
                    uri
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

            // Create the ContractSettings object
            let contractSettings = new CreatorContractSetting("settings")
            contractSettings.platformPrimaryCommission = BigInt.fromI32(100000)
            contractSettings.platformSecondaryCommission = BigInt.fromI32(25000)
            contractSettings.MODULO = BigInt.fromI32(100000)
            contractSettings.factoryContract = Address.fromString(selfSovereignNFT)
            contractSettings.kodaSalesSettingsContract = Address.fromString("0x89afafb0f3c025b53ce863d02f91faf63d71c1ba")
            contractSettings.platform = Address.fromString("0xde9e5ee9e7cd43399969cfb1c0e5596778c6464f")
            contractSettings.save()

            ////////////////////////
            // Mint open edition ///
            ////////////////////////

            const editionId = BigInt.fromI32(200000);
            const listingPrice = BigInt.fromString("100000000000000000");
            const startingDate = BigInt.fromString("1674732534")

            const listingEvent = createListedEditionForBuyNowEvent(editionId, listingPrice, startingDate)
            listingEvent.address = Address.fromString(selfSovereignNFT)

            handleListedForBuyItNow(listingEvent)

            // Assert entities created
            const generatedEditionId = createV4Id(selfSovereignNFT, editionId.toString());
            assert.entityCount(EDITION_ENTITY_TYPE, 1);
            assert.entityCount(ACTIVITY_ENTITY_TYPE, 2);
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "salesType", "6");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "isOpenEdition", "true");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "totalAvailable", "10000");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "remainingSupply", "10000");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "totalSold", "0");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "totalSupply", "0");

            //////////////////////////
            // Setup First Transfer //
            //////////////////////////

            const tokenId = BigInt.fromString("200001");
            const from = ZERO_ADDRESS.toHexString()
            const to = "0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7";

            const transferEvent = createTransferEvent(to, from, tokenId);
            transferEvent.address = Address.fromString(selfSovereignNFT);
            transferEvent.transaction.value = listingPrice;

            const originalCreator = ethereum.Value.fromAddress(Address.fromString(artist));

            createMockedFunction(Address.fromString(selfSovereignNFT), "tokenEditionId", "tokenEditionId(uint256):(uint256)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
                .returns([
                    ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(200000))
                ]);

            createMockedFunction(Address.fromString(selfSovereignNFT), "tokenEditionCreator", "tokenEditionCreator(uint256):(address)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(tokenId)])
                .returns([
                    originalCreator
                ]);

            mockIpfsFile("QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm", "tests/ipfs/QmbBrcWV53c7Jcr9z9RBczJm3kKUMRxyjqcCPUKzSYg1Pm.json");


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
            handleTransfer(transferEvent);

            // Assert entities created
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "totalAvailable", "10000");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "remainingSupply", "9999");
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "totalSupply", "1");

            assert.entityCount(COLLECTOR_ENTITY_TYPE, 2);
            assert.fieldEquals(COLLECTOR_ENTITY_TYPE, from, "address", from);
            assert.fieldEquals(COLLECTOR_ENTITY_TYPE, to, "address", to);

            const generatedTokenId = createV4Id(selfSovereignNFT, tokenId.toString());
            assert.entityCount(TOKEN_ENTITY_TYPE, 1);
            assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "editionNumber", '200000');
            assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "version", "4");
            assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "salesType", SaleTypes.OFFERS_ONLY.toString());
            assert.fieldEquals(TOKEN_ENTITY_TYPE, generatedTokenId, "transferCount", "1");

            assert.entityCount(TRANSFER_ENTITY_TYPE, 1);
            assert.entityCount(DAY_ENTITY_TYPE, 1);
            assert.entityCount(ACTIVITY_ENTITY_TYPE, 3);

            ///////////////////
            // Setup Buy Now //
            ///////////////////

            const buyNowEvent = createBuyNowPurchasedEvent(tokenId, to, artist, listingPrice);
            buyNowEvent.address = Address.fromString(selfSovereignNFT);
            buyNowEvent.transaction.value = listingPrice;

            createMockedFunction(Address.fromString(selfSovereignNFT), "tokenEditionCreator", "tokenEditionCreator(uint256):(address)")
                .withArgs([ethereum.Value.fromUnsignedBigInt(editionId)])
                .returns([
                    originalCreator
                ]);

            handleBuyNowPurchased(buyNowEvent)
            assert.fieldEquals(EDITION_ENTITY_TYPE, generatedEditionId, "totalSold", "1");

            assert.entityCount(TRANSFER_ENTITY_TYPE, 1);
            assert.entityCount(DAY_ENTITY_TYPE, 1);
            assert.entityCount(ACTIVITY_ENTITY_TYPE, 4);
        })
    })
});

export function createTransferEvent(to: string, from: string, tokenId: BigInt): Transfer {
    let transferEvent = changetype<Transfer>(newMockEvent());
    transferEvent.parameters = new Array();
    transferEvent.parameters.push(new ethereum.EventParam("from", ethereum.Value.fromAddress(Address.fromString(from))));
    transferEvent.parameters.push(new ethereum.EventParam("to", ethereum.Value.fromAddress(Address.fromString(to))));
    transferEvent.parameters.push(new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)));
    return transferEvent;
}

export function createBuyNowPurchasedEvent(tokenId: BigInt, buyer: string, currentOwner: string, price: BigInt): BuyNowPurchased {
    let event = changetype<BuyNowPurchased>(newMockEvent());
    event.parameters = new Array();
    event.parameters.push(new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)));
    event.parameters.push(new ethereum.EventParam("buyer", ethereum.Value.fromAddress(Address.fromString(buyer))));
    event.parameters.push(new ethereum.EventParam("currentOwner", ethereum.Value.fromAddress(Address.fromString(currentOwner))));
    event.parameters.push(new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price)));
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

export function createListedEditionForBuyNowEvent(editionId: BigInt, listingPrice: BigInt, startDate: BigInt): ListedEditionForBuyNow {
    let event = changetype<ListedEditionForBuyNow>(newMockEvent());
    event.parameters = new Array();
    event.parameters.push(new ethereum.EventParam("editionId", ethereum.Value.fromUnsignedBigInt(editionId)));
    event.parameters.push(new ethereum.EventParam("listingPrice", ethereum.Value.fromUnsignedBigInt(listingPrice)));
    event.parameters.push(new ethereum.EventParam("startDate", ethereum.Value.fromUnsignedBigInt(startDate)));

    return event
}