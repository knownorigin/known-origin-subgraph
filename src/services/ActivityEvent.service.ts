import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
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
    event.triggeredBy = rawEvent.transaction.from;
    event.transactionHash = rawEvent.transaction.hash;
    event.timestamp = rawEvent.block.timestamp;
    if (buyer) {
        event.buyer = buyer as Address
    }
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
        event = createTokenEvent(id, EVENT_TYPES.TOKEN_LISTED, rawEvent, edition, token, value, owner, null)
        event.save()
    }
}

export function recordSecondaryTokenListingPriceChange(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, owner: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.PRICE_CHANGED, rawEvent, edition, token, value, owner, null)
        event.save()
    }
}

export function recordSecondaryTokenPurchased(rawEvent: ethereum.Event, token: Token, edition: Edition, value: BigInt, owner: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.PURCHASE, rawEvent, edition, token, value, owner, null)
        event.save()
    }
}

export function recordSecondaryTokenDeListed(rawEvent: ethereum.Event, token: Token, owner: Address, edition: Edition): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.TOKEN_DELISTED, rawEvent, edition, token, null, owner, null)
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
    event.eventValueInWei = value;
    event.triggeredBy = rawEvent.transaction.from;
    event.transactionHash = rawEvent.transaction.hash;
    event.timestamp = rawEvent.block.timestamp;
    if (buyer) {
        event.buyer = buyer as Address
    }
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

export function recordTransfer(rawEvent: ethereum.Event, token: Token, edition: Edition, to: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event = ActivityEvent.load(id)
    if (event == null) {
        event = createTokenEvent(id, EVENT_TYPES.TRANSFER, rawEvent, edition, token, null, to, null)
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
