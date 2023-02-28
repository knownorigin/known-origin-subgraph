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
import { Address, BigInt } from "@graphprotocol/graph-ts/index";

describe("Activity event unit tests", () => {

  afterEach(() => {
    clearStore();
  });

  describe("Builds activity event correctly for CC events", () => {

    test("recordCCEditionSalesDisabledUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionSalesDisabledUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "CCEditionSalesDisabledUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCEditionURIUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionURIUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "EditionURIUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCContractPauseToggle()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCContractPauseToggle(CC_ADDRESS, CC_ADDRESS, event, true);

      let entityId = createCreatorContractEventId(CC_ADDRESS, CC_ADDRESS, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "CreatorContractPauseToggledTrue");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCListedEditionForBuyNow()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCListedEditionForBuyNow(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "ListedEditionForBuyNow");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCBuyNowDeListed()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCBuyNowDeListed(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "BuyNowDeListed");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCBuyNowPriceChanged()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCBuyNowPriceChanged(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "BuyNowPriceChanged");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCOwnershipTransferred()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCOwnershipTransferred(CC_ADDRESS, CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, CC_ADDRESS, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "OwnershipTransferred");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCDefaultRoyaltyPercentageUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCDefaultRoyaltyPercentageUpdated(CC_ADDRESS, CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, CC_ADDRESS, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "DefaultRoyaltyPercentageUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCEditionRoyaltyPercentageUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionRoyaltyPercentageUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "EditionRoyaltyPercentageUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCEditionFundsHandlerUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCEditionFundsHandlerUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "EditionFundsHandlerUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCDeployed()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCDeployed(CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, "DEPLOYMENT", event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "CreatorContractDeployed");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordCCBanned()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordCCBanned(CC_ADDRESS, event);

      let entityId = createCreatorContractEventId(CC_ADDRESS, "BAN", event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "CreatorContract");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "CreatorContractBanned");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

    test("recordV4EditionDisabledUpdated()", () => {
      const event = newMockEvent();
      const CC_ADDRESS = "0x9f01f6cb996a4ca47841dd9392335296933c7a9f";
      const artist = "0xcda7fc32898873e1f5a12d23d4532efbcb078901";

      const edition = new Edition("1000-" + CC_ADDRESS);
      edition.version = KODA_V4;
      edition.artistAccount = Address.fromString(artist);
      edition.artistCommission = BigInt.fromString("15000");

      assert.entityCount(ACTIVITY_ENTITY_TYPE, 0);

      recordV4EditionDisabledUpdated(CC_ADDRESS, edition.id, event, edition);

      let entityId = createCreatorContractEventId(CC_ADDRESS, edition.id, event);
      assert.entityCount(ACTIVITY_ENTITY_TYPE, 1);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "type", "EDITION");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "eventType", "CCEditionDisabledUpdated");
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "edition", edition.id);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creator", artist);
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "creatorCommission", edition.artistCommission.toString());
      assert.fieldEquals(ACTIVITY_ENTITY_TYPE, entityId, "contractAddress", CC_ADDRESS);
    });

  });

});