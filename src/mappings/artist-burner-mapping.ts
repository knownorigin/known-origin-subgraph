import {getKnownOriginForAddress} from "../services/KnownOrigin.factory";
import {EditionDeactivated, EditionSupplyReduced} from "../../generated/ArtistEditionBurner/ArtistEditionBurner";
import {loadOrCreateEdition} from "../services/Edition.service";
import {ONE, ZERO} from "../constants";
import {loadOrCreateArtist} from "../services/Artist.service";
import {Address} from "@graphprotocol/graph-ts/index";

export function handleEditionDeactivatedEvent(event: EditionDeactivated): void {
    let contract = getKnownOriginForAddress(event.address)

    // Deactivate the edition
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.active = false;
    editionEntity.totalAvailable = ZERO;
    editionEntity.remaingSupply = ZERO;
    editionEntity.save()

    // Reduce supply and edition count
    let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
    artist.supply = artist.supply.minus(editionEntity.totalAvailable);
    artist.editionsCount = artist.editionsCount.plus(ONE);
    artist.save();
}

export function handleEditionSupplyReducedEvent(event: EditionSupplyReduced): void {
    let contract = getKnownOriginForAddress(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
    // Reduce supply down
    artist.supply = artist.supply.minus(editionEntity.totalAvailable.minus(editionEntity.totalSupply));
    artist.save();

    // Reduce available to total sold
    editionEntity.totalAvailable = editionEntity.totalSupply;
    editionEntity.remaingSupply = ZERO;
    editionEntity.save()
}
