import {Address, BigInt, Bytes, ethereum} from "@graphprotocol/graph-ts/index";
import {ActivityEvent, Edition, Token} from "../../generated/schema";
import {ZERO, ZERO_ADDRESS} from "../utils/constants";
import * as EVENT_TYPES from "../utils/EventTypes";

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

    event.timestamp = rawEvent.block.timestamp;
    event.transactionHash = rawEvent.transaction.hash;
    event.logIndex = rawEvent.transaction.index;
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

    if(buyer) {
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

    event.timestamp = rawEvent.block.timestamp;
    event.transactionHash = rawEvent.transaction.hash;
    event.logIndex = rawEvent.transaction.index;
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

export function recordTransfer(rawEvent: ethereum.Event, token: Token, edition: Edition, from: Address, to: Address): void {
    let id: string = tokenActivityId(token, rawEvent);
    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.TRANSFER, rawEvent, edition, token, null, to, from)
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

function getStakeholderAddressesSecondary(creator: Bytes, seller: Address | null, buyer: Address | null): Bytes[] {
    let arr: Array<Bytes> = new Array<Bytes>()
    arr.push(creator as Bytes)
    if(buyer) {
        arr.push(buyer as Bytes)
    }
    if(seller) {
        arr.push(seller as Bytes)
    }
    return arr
}
