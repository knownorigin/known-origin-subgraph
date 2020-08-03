import {getKnownOriginForAddress} from "../services/KnownOrigin.factory";
import {EditionDeactivated, EditionSupplyReduced} from "../../generated/ArtistEditionBurner/ArtistEditionBurner";
import {loadOrCreateEdition} from "../services/Edition.service";
import {ONE, ZERO} from "../constants";
import {loadOrCreateArtist} from "../services/Artist.service";
import {Address, log} from "@graphprotocol/graph-ts/index";

export function handleEditionDeactivatedEvent(event: EditionDeactivated): void {
    log.info("handleEditionDeactivatedEvent() for edition [{}] with address [{}]", [
        event.params._editionNumber.toString(),
        event.address.toHexString()
    ]);
    let contract = getKnownOriginForAddress(event.address)

    // Deactivate the edition
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.active = false;
    editionEntity.totalAvailable = ZERO;
    editionEntity.remainingSupply = ZERO;
    editionEntity.save()

    // N.B: Do not reduce edition supply and count - this is done by hooks in the callHandlers()
}

export function handleEditionSupplyReducedEvent(event: EditionSupplyReduced): void {
    log.info("handleEditionSupplyReducedEvent() for edition [{}] with address [{}]", [
        event.params._editionNumber.toString(),
        event.address.toHexString()
    ]);
    let contract = getKnownOriginForAddress(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
    // Reduce supply down
    artist.supply = artist.supply.minus(editionEntity.totalAvailable.minus(editionEntity.totalSupply));
    artist.save();

    // Reduce available to total sold
    editionEntity.totalAvailable = editionEntity.totalSupply;
    editionEntity.remainingSupply = ZERO;
    editionEntity.save()
}
