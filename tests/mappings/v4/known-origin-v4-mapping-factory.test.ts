import {afterEach, assert, clearStore, createMockedFunction, describe, test} from "matchstick-as";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {handleSelfSovereignERC721Deployed} from "../../../src/mappings/v4-creator-contracts/factory";
import {createSelfSovereignERC721DeployedEvent} from "./known-origin-v4-mapping-creator-contract.test";
import {ACTIVITY_ENTITY_TYPE, CREATOR_CONTRACT_ENTITY_TYPE} from "../entities";


describe("KODA V4 Factory tests", () => {

    afterEach(() => {
        clearStore();
    });

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

        assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
    })

})