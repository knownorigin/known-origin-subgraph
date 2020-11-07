import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
import {ActivityEvent, Edition, Token} from "../../generated/schema";
import {ZERO, ZERO_ADDRESS} from "../constants";

const TYPE_EDITION = "EDITION";
const TYPE_TOKEN = "TOKEN";

const EDITION_CREATED = "EditionCreated"
const EDITION_GIFTED = "EditionGifted"
const PURCHASE = "Purchase"
const BID_PLACED = "BidPlaced"
const BID_ACCEPTED = "BidAccepted"
const BID_INCREASED = "BidIncreased"
const BID_REJECTED = "BidRejected"
const BID_WITHDRAWN = "BidWithdrawn"
const TOKEN_LISTED = "TokenListed"
const TOKEN_DELISTED = "TokenDeListed"
const TRANSFER = "Transfer"

// Artwork management actions
const PRICE_CHANGED = "PriceChanged"

//////////////////////////////
// Primary sales - editions //
//////////////////////////////

// ['EditionCreated', 'Purchase', 'BidPlaced', 'BidAccepted', 'BidIncreased', 'BidRejected', 'BidWithdrawn']

export function recordEditionCreated(rawEvent: ethereum.Event, edition: Edition | null): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, EDITION_CREATED, rawEvent, edition, null, null)
        event.save()
    }
}

export function recordPrimarySale(rawEvent: ethereum.Event, edition: Edition | null, token: Token | null, value: BigInt, buyer: Address): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, PURCHASE, rawEvent, edition, value, buyer)
        event.token = token.id
        event.save()
    }
}

export function recordPrimaryBidPlaced(rawEvent: ethereum.Event, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, BID_PLACED, rawEvent, edition, value, buyer)
        event.save()
    }
}

export function recordPrimaryBidAccepted(rawEvent: ethereum.Event, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, BID_ACCEPTED, rawEvent, edition, value, buyer)
        event.save()
    }
}

export function recordPrimaryBidIncreased(rawEvent: ethereum.Event, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, BID_INCREASED, rawEvent, edition, value, buyer)
        event.save()
    }
}

export function recordPrimaryBidRejected(rawEvent: ethereum.Event, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, BID_REJECTED, rawEvent, edition, value, buyer)
        event.save()
    }
}

export function recordPrimaryBidWithdrawn(rawEvent: ethereum.Event, edition: Edition | null, buyer: Address): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, BID_WITHDRAWN, rawEvent, edition, null, buyer)
        event.save()
    }
}

function createEditionEvent(
    id: string,
    eventType: string,
    rawEvent: ethereum.Event,
    edition: Edition | null,
    value: BigInt | null,
    buyer: Address | null
): ActivityEvent {
    let event: ActivityEvent = new ActivityEvent(id.toString());
    event.type = TYPE_EDITION
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

function editionActivityId(edition: Edition | null, rawEvent: ethereum.Event): string {
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

export function recordSecondarySale(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, PURCHASE, rawEvent, edition, token, value, buyer)
        event.save()
    }
}

export function recordSecondaryBidRejected(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, BID_REJECTED, rawEvent, edition, token, value, buyer)
        event.save()
    }
}

export function recordSecondaryBidPlaced(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, BID_PLACED, rawEvent, edition, token, value, buyer)
        event.save()
    }
}

export function recordSecondaryBidAccepted(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, value: BigInt, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, BID_ACCEPTED, rawEvent, edition, token, value, buyer)
        event.save()
    }
}

export function recordSecondaryTokenListed(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, value: BigInt): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, TOKEN_LISTED, rawEvent, edition, token, value, null)
        event.save()
    }
}
export function recordSecondaryTokenDeListed(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, TOKEN_DELISTED, rawEvent, edition, token, null, null)
        event.save()
    }
}

export function recordSecondaryBidWithdrawn(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, buyer: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, BID_WITHDRAWN, rawEvent, edition, token, null, buyer)
        event.save()
    }
}

function createTokenEvent(
    id: string,
    eventType: string,
    rawEvent: ethereum.Event,
    edition: Edition | null,
    token: Token | null,
    value: BigInt | null,
    buyer: Address | null
): ActivityEvent {
    let event: ActivityEvent = new ActivityEvent(id.toString());
    event.type = TYPE_TOKEN
    event.eventType = eventType
    event.token = token.id
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

function tokenActivityId(token: Token | null, rawEvent: ethereum.Event): string {
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

export function recordTransfer(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null, to: Address): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, TRANSFER, rawEvent, edition, token, null, to)
        event.save()
    }
}

export function recordEditionGifted(rawEvent: ethereum.Event, token: Token | null, edition: Edition | null): void {

    let id: string = tokenActivityId(token, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createTokenEvent(id, EDITION_GIFTED, rawEvent, edition, token, null, Address.fromString(token.currentOwner))
        event.save()
    }
}

export function recordPriceChanged(rawEvent: ethereum.Event, edition: Edition | null, value: BigInt): void {

    let id: string = editionActivityId(edition, rawEvent);

    let event: ActivityEvent | null = ActivityEvent.load(id)

    if (event == null) {
        event = createEditionEvent(id, PRICE_CHANGED, rawEvent, edition, value, null)
        event.save()
    }
}
