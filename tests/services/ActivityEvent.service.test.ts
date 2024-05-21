import { afterEach, assert, clearStore, describe, newMockEvent, test } from "matchstick-as";
import {
  createCreatorContractEventId,
  recordCCBanned,
  recordCCBuyNowDeListed,
  recordCCBuyNowPriceChanged,
  recordCCContractPauseToggle,
  recordCCDefaultRoyaltyPercentageUpdated,
  recordCCDeployed,
  recordCCEditionFundsHandlerUpdated,
  recordCCEditionRoyaltyPercentageUpdated,
  recordCCEditionSalesDisabledUpdated,
  recordCCEditionURIUpdated,
  recordCCListedEditionForBuyNow,
  recordCCOwnershipTransferred,
  recordV4EditionDisabledUpdated
} from "../../src/services/ActivityEvent.service";
import { Edition } from "../../generated/schema";
import { ACTIVITY_ENTITY_TYPE } from "../mappings/entities";
import { KODA_V4 } from "../../src/utils/KodaVersions";
import {Address, BigInt, Bytes} from "@graphprotocol/graph-ts/index";
import {log} from "@graphprotocol/graph-ts/index";

describe("Activity event unit tests", () => {

  afterEach(() => {
    clearStore();
  });

  describe("Builds activity event correctly for CC events", () => {

    test("recordCCEditionSalesDisabledUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionSalesDisabledUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "CCEditionSalesDisabledUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toHexString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toHexString());
    });

    test("recordCCEditionURIUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionURIUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "EditionURIUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCContractPauseToggle()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCContractPauseToggle(CC_ADDRESS, CC_ADDRESS, event, true);

      let entityId = createCreatorContractEventId(CC_ADDRESS, CC_ADDRESS, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "CreatorContractPauseToggledTrue");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCListedEditionForBuyNow()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCListedEditionForBuyNow(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "ListedEditionForBuyNow");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCBuyNowDeListed()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCBuyNowDeListed(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "BuyNowDeListed");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCBuyNowPriceChanged()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCBuyNowPriceChanged(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "BuyNowPriceChanged");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCOwnershipTransferred()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCOwnershipTransferred(CC_ADDRESS, CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, CC_ADDRESS, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "OwnershipTransferred");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCDefaultRoyaltyPercentageUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCDefaultRoyaltyPercentageUpdated(CC_ADDRESS, CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, CC_ADDRESS, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "DefaultRoyaltyPercentageUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCEditionRoyaltyPercentageUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionRoyaltyPercentageUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "EditionRoyaltyPercentageUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCEditionFundsHandlerUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionFundsHandlerUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "EditionFundsHandlerUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCDeployed()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCDeployed(CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, Bytes.fromUTF8("DEPLOYMENT"), event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "CreatorContractDeployed");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordCCBanned()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCBanned(CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, Bytes.fromUTF8("BAN"), event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "CreatorContractBanned");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

    test("recordV4EditionDisabledUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = Address.fromString("0x9f01f6cb996a4ca47841dd9392335296933c7a9f");
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition(Bytes.fromUTF8("1000-" + CC_ADDRESS.toHexString()));
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordV4EditionDisabledUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      log.info(" ******* + " + edition.id.toString(), [])
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "eventType", "CCEditionDisabledUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "edition", edition.id.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId.toHexString(), "contractAddress", CC_ADDRESS.toString());
    });

  });

});