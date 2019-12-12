import {
    Address,
} from "@graphprotocol/graph-ts"

import {AuctionEnabled} from "../../generated/ArtistAcceptingBidsV2/ArtistAcceptingBidsV2";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin"

import {loadOrCreateEdition} from "../services/Edition.service";

export function handleAuctionEnabled(event: AuctionEnabled): void {
    let contract = KnownOrigin.bind(Address.fromString("0xFBeef911Dc5821886e1dda71586d90eD28174B7d"))

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
    editionEntity.auctionEnabled = true
    editionEntity.save()
}
