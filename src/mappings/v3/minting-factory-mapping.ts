import {Address, log} from "@graphprotocol/graph-ts/index";

import {EditionMintedAndListed, MintingFactory} from "../../../generated/MintingFactoryCreations/MintingFactory";

import {ArtistMintingConfig} from "../../../generated/schema";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";

import * as artistService from "../../services/Artist.service";
import * as editionService from "../../services/Edition.service";

export function handleEditionMintedAndListed(event: EditionMintedAndListed): void {
    log.info("Minting factory - handleEditionMintedAndListed() called - edition ID {}", [
        event.params._editionId.toString()
    ]);

    let mintingFactory = MintingFactory.bind(event.address);
    let contract = KnownOriginV3.bind(mintingFactory.koda())

    // get the edition to find the artist
    let edition = editionService.loadOrCreateV3Edition(event.params._editionId, event.block, contract)
    edition.save()

    const artistAccount = Address.fromString(edition.artistAccount.toHexString());

    let artistEntity = artistService.loadOrCreateArtist(artistAccount);
    artistEntity.save()

    let mintingConfig = mintingFactory.currentMintConfig(artistAccount);

    // update the current known minting rules state
    let config = ArtistMintingConfig.load(artistEntity.mintingConfig)
    config.mints = mintingConfig.value0;
    config.firstMintInPeriod = mintingConfig.value1;
    config.save()
}
