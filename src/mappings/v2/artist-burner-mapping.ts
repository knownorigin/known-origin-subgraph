import {getKnownOriginV2ForAddress} from "./KODAV2AddressLookup";
import {EditionDeactivated, EditionSupplyReduced} from "../../../generated/ArtistEditionBurner/ArtistEditionBurner";
import {ONE, ZERO} from "../../utils/constants";
import {Address, log} from "@graphprotocol/graph-ts/index";

import {isEditionBurnt} from "../../services/burnt-editions";

import * as editionService from "../../services/Edition.service";
import * as artistService from "../../services/Artist.service";

export function handleEditionDeactivatedEvent(event: EditionDeactivated): void {
    log.info("handleEditionDeactivatedEvent() for edition [{}] with address [{}]", [
        event.params._editionNumber.toString(),
        event.address.toHexString()
    ]);
    let contract = getKnownOriginV2ForAddress(event.address)

    // Deactivate the edition
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.active = false;
    editionEntity.totalAvailable = ZERO;
    editionEntity.remainingSupply = ZERO;
    editionEntity.save()

    // If the burn is not already handled by the hard coded list, then make sure we reduce artists counts
    let isHardCodedBurnt = isEditionBurnt(event.params._editionNumber);
    if (!isHardCodedBurnt) {
        let artist = artistService.loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
        artist.editionsCount = artist.editionsCount.minus(ONE);
        artist.supply = artist.supply.minus(editionEntity.totalAvailable);
        artist.save()
    }
}

export function handleEditionSupplyReducedEvent(event: EditionSupplyReduced): void {
    log.info("handleEditionSupplyReducedEvent() for edition [{}] with address [{}]", [
        event.params._editionNumber.toString(),
        event.address.toHexString()
    ]);
    let contract = getKnownOriginV2ForAddress(event.address)

    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    let artist = artistService.loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
    // Reduce supply down
    artist.supply = artist.supply.minus(editionEntity.totalAvailable.minus(editionEntity.totalSupply));
    artist.save();

    // Reduce available to total sold
    editionEntity.totalAvailable = editionEntity.totalSupply;
    editionEntity.remainingSupply = ZERO;
    editionEntity.save()
}
