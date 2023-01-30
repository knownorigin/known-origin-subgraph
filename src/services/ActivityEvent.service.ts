import {Address, BigInt, Bytes, ethereum} from "@graphprotocol/graph-ts/index";
import {ActivityEvent, Edition, GatedSale, Phase, Token} from "../../generated/schema";
import {CREATOR_CONTRACT, ZERO, ZERO_ADDRESS} from "../utils/constants";
import * as EVENT_TYPES from "../utils/EventTypes";
import {
    BuyNowDeListed,
    BuyNowPriceChanged,
    DefaultRoyaltyPercentageUpdated,
    EditionFundsHandlerUpdated,
    EditionRoyaltyPercentageUpdated,
    EditionURIUpdated,
    ListedEditionForBuyNow,
    OwnershipTransferred
} from "../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";

let TYPE_EDITION = "EDITION";
let TYPE_TOKEN = "TOKEN";

//////////////////////////////
// Primary sales - editions //
//////////////////////////////

// ['EditionCreated', 'Purchase', 'BidPlaced', 'BidAccepted', 'BidIncreased', 'BidRejected', 'BidWithdrawn']

export function recordEditionCreated(rawEvent: ethereum.Event, edition: Edition): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, EVENT_TYPES.EDITION_CREATED, rawEvent, edition, null, null)
        event.save()
    }
}

export function recordEditionDisabled(rawEvent: ethereum.Event, edition: Edition): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, EVENT_TYPES.EDITION_DISABLED, rawEvent, edition, null, null)
        event.save()
    }
}

export function recordPrimarySaleEvent(
    rawEvent: ethereum.Event,
    eventType: string,
    edition: Edition,
    token: Token | null,
    value: BigInt | null,
    buyer: Address | null
): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, eventType, rawEvent, edition, value, buyer)
        if (token) {
            event.seller = edition.artistAccount
            event.token = token.id
        }
        event.save()
    }
}

function createEditionEvent(
    id: string,
    eventType: string,
    rawEvent: ethereum.Event,
    edition: Edition,
    value: BigInt | null,
    buyer: Address | null
): ActivityEvent {
    let event: ActivityEvent = new ActivityEvent(id.toString());
    event.type = TYPE_EDITION
    event.version = edition.version
    event.eventType = eventType
    event.edition = edition.id
    event.creator = edition.artistAccount || ZERO_ADDRESS;
    event.creatorCommission = edition.artistCommission || ZERO;
    event.collaborator = edition.optionalCommissionAccount || ZERO_ADDRESS;
    event.collaboratorCommission = edition.optionalCommissionRate;
    event.eventValueInWei = value;
    event.stakeholderAddresses = getStakeholderAddressesPrimary(edition, buyer)
    event.triggeredBy = rawEvent.transaction.from;

    if (buyer) {
        event.buyer = buyer as Address
    }

    // `${transactionHash}-${logIndex}` is unique to each log
    event.timestamp = rawEvent.block.timestamp;
    event.transactionHash = rawEvent.transaction.hash;
    // The transactionIndex is the index of the transaction in the block
    event.transactionIndex = rawEvent.transaction.index;
    // The logIndex is the index of the log in the block logs
    event.logIndex = rawEvent.transactionLogIndex;
    event.eventAddress = rawEvent.address;
    if (rawEvent.transaction.to) {
        event.eventTxTo = rawEvent.transaction.to;
    }
    event.eventTxFrom = rawEvent.transaction.from;
    event.blockNumber = rawEvent.block.number;

    return event
}

function editionActivityId(edition: Edition, rawEvent: ethereum.Event): string {
    return "edition"
        .concat("-")
        .concat(edition.id)
        .concat("-")
        .concat(rawEvent.transaction.hash.toHexString())
        .concat("-")
        .concat(rawEvent.logIndex.toString());
}

function getStakeholderAddressesPrimary(edition: Edition, buyer: Address | null): Bytes[] {
    let arr = edition.collaborators

    if (buyer) {
        arr.push(buyer as Bytes)
    }

    return arr
}

////////////////////////////////
// Secondary sales - editions //
////////////////////////////////

// ['Purchase', 'BidRejected', 'BidPlaced', 'BidAccepted', ''BidWithdrawn']

export function recordSecondarySale(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address, seller: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.PURCHASE, rawEvent, edition, token, value, buyer, seller)
        event.save()
    }
}

export function recordSecondaryBidRejected(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.BID_REJECTED, rawEvent, edition, token, value, buyer, null)
        event.save()
    }
}

export function recordSecondaryBidPlaced(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.BID_PLACED, rawEvent, edition, token, value, buyer, null)
        event.save()
    }
}

export function recordSecondaryBidAccepted(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address, seller: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.BID_ACCEPTED, rawEvent, edition, token, value, buyer, seller)
        event.save()
    }
}

export function recordSecondaryTokenListed(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, owner: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.TOKEN_LISTED, rawEvent, edition, token, value, null, owner)
        event.save()
    }
}

export function recordSecondaryTokenReserveAuctionListed(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, owner: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.RESERVE_AUCTION_LISTED, rawEvent, edition, token, value, null, owner)
        event.save()
    }
}

export function recordSecondaryTokenReserveAuctionCountdownStarted(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address, seller: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.RESERVE_COUNTDOWN_STARTED, rawEvent, edition, token, value, buyer, seller)
        event.save()
    }
}

export function recordSecondaryTokenReserveAuctionExtended(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address, seller: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.RESERVE_EXTENDED, rawEvent, edition, token, value, buyer, seller)
        event.save()
    }
}


export function recordSecondaryTokenReserveAuctionBidPlaced(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, buyer: Address, seller: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.RESERVE_BID_PLACED, rawEvent, edition, token, value, buyer, seller)
        event.save()
    }
}

export function recordSecondaryTokenListingPriceChange(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, owner: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.PRICE_CHANGED, rawEvent, edition, token, value, null, owner)
        event.save()
    }
}

export function recordSecondaryTokenReserveListingPriceChange(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, owner: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.RESERVE_PRICE_CHANGED, rawEvent, edition, token, value, null, owner)
        event.save()
    }
}

export function recordSecondaryTokenDeListed(rawEvent: ethereum.Event, token: Token, owner: Address, edition: Edition): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.TOKEN_DELISTED, rawEvent, edition, token, null, null, owner)
        event.save()
    }
}

export function recordSecondaryBidWithdrawn(rawEvent: ethereum.Event, token: Token, edition: Edition, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.BID_WITHDRAWN, rawEvent, edition, token, null, buyer, null)
        event.save()
    }
}

function createTokenEvent(
    id: string,
    eventType: string,
    rawEvent: ethereum.Event,
    edition: Edition,
    token: Token,
    value: BigInt | null,
    buyer: Address | null,
    seller: Address | null,
): ActivityEvent {
    let event: ActivityEvent = new ActivityEvent(id.toString());
    event.version = edition.version
    event.type = TYPE_TOKEN
    event.eventType = eventType
    event.token = token.id
    event.edition = edition.id
    event.seller = seller || ZERO_ADDRESS;
    event.creator = edition.artistAccount || ZERO_ADDRESS;
    event.creatorCommission = edition.artistCommission || ZERO;
    event.collaborator = edition.optionalCommissionAccount || ZERO_ADDRESS;
    event.collaboratorCommission = edition.optionalCommissionRate;
    event.stakeholderAddresses = getStakeholderAddressesSecondary(edition.artistAccount, seller, buyer)
    event.eventValueInWei = value;
    event.triggeredBy = rawEvent.transaction.from;

    if (buyer) {
        event.buyer = buyer as Address
    }

    // `${transactionHash}-${logIndex}` is unique to each log
    event.timestamp = rawEvent.block.timestamp;
    event.transactionHash = rawEvent.transaction.hash;
    // The transactionIndex is the index of the transaction in the block
    event.transactionIndex = rawEvent.transaction.index;
    // The logIndex is the index of the log in the block logs
    event.logIndex = rawEvent.transactionLogIndex;
    event.eventAddress = rawEvent.address;
    if (rawEvent.transaction.to) {
        event.eventTxTo = rawEvent.transaction.to;
    }
    event.eventTxFrom = rawEvent.transaction.from;
    event.blockNumber = rawEvent.block.number;

    return event
}

function tokenActivityId(token: Token, rawEvent: ethereum.Event): string {
    return "token"
        .concat("-")
        .concat(token.id)
        .concat("-")
        .concat(rawEvent.transaction.hash.toHexString())
        .concat("-")
        .concat(rawEvent.logIndex.toString());
}

////////////////////////////////////////
// Generic events - tokens & editions //
////////////////////////////////////////

// ['Transfer'', 'EditionGifted', 'PriceChanged']

export function recordTransfer(rawEvent: ethereum.Event, token: Token, edition: Edition, to: Address, from: Address, value: BigInt | null): void {
    let id: string = tokenActivityId(token, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.TRANSFER, rawEvent, edition, token, value, to, from)
        event.save()
    }
}

export function recordEditionGifted(rawEvent: ethereum.Event, token: Token, edition: Edition): void {
    let id: string = tokenActivityId(token, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        // @ts-ignore
        event = createTokenEvent(id, EVENT_TYPES.EDITION_GIFTED, rawEvent, edition, token, null, Address.fromString(token.currentOwner), null)
        event.save()
    }
}

export function recordPriceChanged(rawEvent: ethereum.Event, edition: Edition, value: BigInt): void {
    let id: string = editionActivityId(edition, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, EVENT_TYPES.PRICE_CHANGED, rawEvent, edition, value, null)
        event.save()
    }
}

export function recordComposableAdded(rawEvent: ethereum.Event, edition: Edition): void {
    let id: string = editionActivityId(edition, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, EVENT_TYPES.COMPOSABLE_ADDED, rawEvent, edition, null, null)
        event.save()
    }
}

export function recordComposableClaimed(rawEvent: ethereum.Event, edition: Edition): void {
    let id: string = editionActivityId(edition, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, EVENT_TYPES.COMPOSABLE_CLAIMED, rawEvent, edition, null, null)
        event.save()
    }
}

export function recordSalesTypeChange(rawEvent: ethereum.Event, edition: Edition): void {
    let id: string = editionActivityId(edition, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createEditionEvent(id, EVENT_TYPES.SALES_TYPE_CHANGED, rawEvent, edition, null, null)
        event.save()
    }
}

function getStakeholderAddressesSecondary(creator: Bytes, seller: Address | null, buyer: Address | null): Bytes[] {
    let arr: Array<Bytes> = new Array<Bytes>()
    arr.push(creator as Bytes)
    if (buyer) {
        arr.push(buyer as Bytes)
    }
    if (seller) {
        arr.push(seller as Bytes)
    }
    return arr
}

function createGatedId(type: string, saleId: string, phaseId: string, editionId: string, event: ethereum.Event): string {
    return type
        .concat("-")
        .concat(saleId)
        .concat("-")
        .concat(phaseId)
        .concat("-")
        .concat(editionId)
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.logIndex.toString());
}

function createdGatedEvent(ID: string, type: string, rawEvent: ethereum.Event, sale: GatedSale, edition: Edition, phase: Phase | null): ActivityEvent {
    let event: ActivityEvent = new ActivityEvent(ID);

    event.version = edition.version
    event.type = TYPE_EDITION
    event.eventType = type
    event.edition = edition.id
    event.seller = edition.artistAccount || ZERO_ADDRESS
    event.creator = edition.artistAccount || ZERO_ADDRESS
    event.creatorCommission = sale.primarySaleCommission
    event.collaborator = ZERO_ADDRESS
    event.collaboratorCommission = edition.optionalCommissionRate;
    event.stakeholderAddresses = [edition.artistAccount || ZERO_ADDRESS]
    event.triggeredBy = edition.artistAccount || ZERO_ADDRESS

    event.eventValueInWei = ZERO
    if (phase != null) {
        event.eventValueInWei = phase.priceInWei
    }

    // `${transactionHash}-${logIndex}` is unique to each log
    event.timestamp = rawEvent.block.timestamp;
    event.transactionHash = rawEvent.transaction.hash;
    // The transactionIndex is the index of the transaction in the block
    event.transactionIndex = rawEvent.transaction.index;
    // The logIndex is the index of the log in the block logs
    event.logIndex = rawEvent.transactionLogIndex;
    event.eventAddress = rawEvent.address;
    if (rawEvent.transaction.to) {
        event.eventTxTo = rawEvent.transaction.to;
    }
    event.eventTxFrom = rawEvent.transaction.from;
    event.blockNumber = rawEvent.block.number;

    return event
}

export function recordGatedSaleCreated(rawEvent: ethereum.Event, sale: GatedSale, edition: Edition): void {
    let ID = createGatedId("gatedSale", sale.id, "0", edition.id, rawEvent)

    let event = createdGatedEvent(ID, EVENT_TYPES.GATED_SALE_CREATED, rawEvent, sale, edition, null)

    event.save()
}

export function recordGatedPhaseCreated(rawEvent: ethereum.Event, sale: GatedSale, edition: Edition, phase: Phase): void {
    let ID = createGatedId("gatedSalePhase", sale.id, phase.id, edition.id, rawEvent)

    let event = createdGatedEvent(ID, EVENT_TYPES.GATED_SALE_PHASE_CREATED, rawEvent, sale, edition, phase)

    event.save()
}

export function recordGatedPhaseRemoved(rawEvent: ethereum.Event, sale: GatedSale, edition: Edition, phase: Phase): void {
    let ID = createGatedId("gatedSalePhase", sale.id, phase.id, edition.id, rawEvent)

    let event = createdGatedEvent(ID, EVENT_TYPES.GATED_SALE_PHASE_REMOVED, rawEvent, sale, edition, phase)

    event.save()
}

export function recordGatedSalePaused(rawEvent: ethereum.Event, sale: GatedSale, edition: Edition): void {
    let ID = createGatedId("gatedSale", sale.id, "0", edition.id, rawEvent)

    let event = createdGatedEvent(ID, EVENT_TYPES.GATED_SALE_PAUSED, rawEvent, sale, edition, null)

    event.save()
}

export function recordGatedSaleResumed(rawEvent: ethereum.Event, sale: GatedSale, edition: Edition): void {
    let ID = createGatedId("gatedSale", sale.id, "0", edition.id, rawEvent)

    let event = createdGatedEvent(ID, EVENT_TYPES.GATED_SALE_RESUMED, rawEvent, sale, edition, null)

    event.save()
}

function createCreatorContractEventId(address: string, id: string, event: ethereum.Event): string {
    return CREATOR_CONTRACT
        .concat("-")
        .concat(address)
        .concat("-")
        .concat(id)
        .concat("-")
        .concat(event.transaction.hash.toHexString())
        .concat("-")
        .concat(event.logIndex.toString());
}

function createdCreatorContractEvent(ID: string, type: string, rawEvent: ethereum.Event, edition: Edition | null): ActivityEvent {
    let event: ActivityEvent = new ActivityEvent(ID);

    // check for deployment here if the right eventType
    if (type === "CreatorContractDeployed") {
        event.version = BigInt.fromString("4")
        event.type = CREATOR_CONTRACT // For V4, we're either dealing with an edition or something at the global contract level
        event.eventType = type
        event.edition = null
        event.seller = rawEvent.transaction.from
        event.creator = rawEvent.transaction.from
        event.creatorCommission = ZERO
        event.collaborator = ZERO_ADDRESS
        event.collaboratorCommission = ZERO;
        event.stakeholderAddresses = [rawEvent.transaction.from];
        event.triggeredBy = rawEvent.transaction.from;
    }
    else {
        event.version = edition ? edition.version : BigInt.fromString("4")
        event.type = edition ? TYPE_EDITION : CREATOR_CONTRACT // For V4, we're either dealing with an edition or something at the global contract level
        event.eventType = type
        event.edition = edition ? edition.id : null
        event.seller = edition ? edition.artistAccount : ZERO_ADDRESS
        event.creator = edition ? edition.artistAccount : ZERO_ADDRESS // eventTxFrom can be used here
        event.creatorCommission = ZERO
        event.collaborator = ZERO_ADDRESS
        event.collaboratorCommission = edition ? edition.optionalCommissionRate : ZERO;
        event.stakeholderAddresses = [edition ? edition.artistAccount : ZERO_ADDRESS] //eventTxFrom can be used here
        event.triggeredBy = edition ? edition.artistAccount : ZERO_ADDRESS // eventTxFrom can be used here
    }

    event.eventValueInWei = ZERO



    // `${transactionHash}-${logIndex}` is unique to each log
    event.timestamp = rawEvent.block.timestamp;
    event.transactionHash = rawEvent.transaction.hash;
    // The transactionIndex is the index of the transaction in the block
    event.transactionIndex = rawEvent.transaction.index;
    // The logIndex is the index of the log in the block logs
    event.logIndex = rawEvent.transactionLogIndex;
    event.eventAddress = rawEvent.address;
    if (rawEvent.transaction.to) {
        event.eventTxTo = rawEvent.transaction.to;
    }
    event.eventTxFrom = rawEvent.transaction.from;
    event.blockNumber = rawEvent.block.number;

    return event
}

export function recordCCEditionSalesDisabledUpdated(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "CCEditionSalesDisabledUpdated", event, edition);
    ccEvent.save();
}

export function recordCCEditionURIUpdated(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "EditionURIUpdated", event, edition);
    ccEvent.save();
}

export function recordCCContractPauseToggle(address: string, id: string, event: ethereum.Event, enabled: boolean): void {
    let ID = createCreatorContractEventId(address, id, event);
    let type = "CreatorContractPauseToggled" + (enabled ? "True" : "False")
    let ccEvent = createdCreatorContractEvent(ID, type, event, null);
    ccEvent.save();
}

export function recordCCListedEditionForBuyNow(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "ListedEditionForBuyNow", event, edition);
    ccEvent.save();
}

export function recordCCBuyNowDeListed(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "BuyNowDeListed", event, edition);
    ccEvent.save();
}

export function recordCCBuyNowPriceChanged(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "BuyNowPriceChanged", event, edition);
    ccEvent.save();
}

export function recordCCOwnershipTransferred(address: string, id: string, event: ethereum.Event): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "OwnershipTransferred", event, null);
    ccEvent.save();
}

export function recordCCDefaultRoyaltyPercentageUpdated(address: string, id: string, event: ethereum.Event): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "DefaultRoyaltyPercentageUpdated", event, null);
    ccEvent.save();
}

export function recordCCEditionRoyaltyPercentageUpdated(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "EditionRoyaltyPercentageUpdated", event, edition);
    ccEvent.save();
}

export function recordCCEditionFundsHandlerUpdated(address: string, id: string, event: ethereum.Event, edition: Edition): void {
    let ID = createCreatorContractEventId(address, id, event);
    let ccEvent = createdCreatorContractEvent(ID, "EditionFundsHandlerUpdated", event, edition);
    ccEvent.save();
}

export function recordCCDeployed(address: string, event: ethereum.Event): void {
    let ID = createCreatorContractEventId(address, "DEPLOYMENT", event);
    let ccEvent = createdCreatorContractEvent(ID, "CreatorContractDeployed", event, null);
    ccEvent.save();
}

export function recordCCBanned(address: string, event: ethereum.Event): void {
    let ID = createCreatorContractEventId(address, "BAN", event);
    let ccEvent = createdCreatorContractEvent(ID, "CreatorContractBanned", event, null);
    ccEvent.save();
}
