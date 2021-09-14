import {Address, log} from "@graphprotocol/graph-ts/index";

import {
    EditionMintedAndListed,
    MintingFactory
} from "../../../generated/MintingFactoryCreations/MintingFactory";

import {loadOrCreateArtist} from "../../services/Artist.service";
import {ArtistMintingConfig} from "../../../generated/schema";
import {loadOrCreateV3Edition} from "../../services/Edition.service";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";

export function handleEditionMintedAndListed(event: EditionMintedAndListed): void {
    log.info("Minting factory - handleEditionMintedAndListed() called - edition ID {}", [
        event.params._editionId.toString()
    ]);

    let mintingFactory = MintingFactory.bind(event.address);
    let contract = KnownOriginV3.bind(mintingFactory.koda())

    // get the edition to find the artist
    let edition = loadOrCreateV3Edition(event.params._editionId, event.block, contract)
    edition.save()

    const artistAccount = Address.fromString(edition.artistAccount.toHexString());

    let artistEntity = loadOrCreateArtist(artistAccount);
    artistEntity.save()

    let mintingConfig = mintingFactory.currentMintConfig(artistAccount);

    // update the current known minting rules state
    let config = ArtistMintingConfig.load(artistEntity.mintingConfig)
    config.mints = mintingConfig.value0;
    config.firstMintInPeriod = mintingConfig.value1;
    config.save()
}
