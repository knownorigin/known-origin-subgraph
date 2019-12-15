import {
    Address,
} from "@graphprotocol/graph-ts"

import {
    AuctionEnabled,
    BidPlaced,
    BidAccepted,
    BidRejected,
    BidWithdrawn,
    BidIncreased,
} from "../../generated/ArtistAcceptingBidsV2/ArtistAcceptingBidsV2";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin"

import {loadOrCreateEdition} from "../services/Edition.service";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
    editionEntity.auctionEnabled = true
    editionEntity.save()
}

// Bidding flow works like this:
// Edition is added to Action Contracts = AuctionEnabled
//
// Offers can be:
//
//  Rejected = BidRejected
//      - rejected by the artist
//      - monies returned to highest bidder, no open offers left
//
//  Withdrawn = BidWithdrawn
//      - bidder revokes offer (commonly if not accepted within a timeframe or social comms highlight not enough)
//      - monies returned to highest bidder
//
//  Increased = BidIncreased
//      - highest bidder increases their offer
//      - additional monies added
//
//  Accepted = BidAccepted
//      - Artist (or KO in very very small circumstances) accepts the current highest offer
//      - monies split between artist/KO & optional commission split
//      - no open offer remaining (new offers can now be made if not sold out)

export function handleBidPlaced(event: BidPlaced): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
}

export function handleBidAccepted(event: BidAccepted): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
}

export function handleBidRejected(event: BidRejected): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
}

export function handleBidWithdrawn(event: BidWithdrawn): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
}

export function handleBidIncreased(event: BidIncreased): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
}


