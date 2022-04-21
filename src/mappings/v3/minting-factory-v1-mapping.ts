import {Address, log} from "@graphprotocol/graph-ts/index";

import {
    AdminFrequencyOverrideChanged,
    AdminMaxMintsInPeriodChanged,
    EditionMintedAndListed,
    AdminMintingPeriodChanged,
    MintingFactoryCreated,
    MintingFactory
} from "../../../generated/MintingFactoryV1/MintingFactory";

import {ArtistMintingConfig} from "../../../generated/schema";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";

import * as artistService from "../../services/Artist.service";
import * as editionService from "../../services/Edition.service";
import * as platformConfig from "../../services/PlatformConfig.factory";

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

export function handleMintingFactoryCreated(event: MintingFactoryCreated): void {
    log.info("Minting factory - handleMintingFactoryCreated() called", []);
    const factory = MintingFactory.bind(event.address)

    let config = platformConfig.getPlatformConfig();
    config.maxMintsInPeriod = factory.maxMintsInPeriod();
    config.mintingPeriod = factory.mintingPeriod();
    config.save()
}

export function handleAdminMintingPeriodChanged(event: AdminMintingPeriodChanged): void {
    log.info("Minting factory - handleAdminMintingPeriodChanged() called", []);
    let config = platformConfig.getPlatformConfig();
    config.mintingPeriod = event.params._mintingPeriod;
    config.save()
}

export function handleAdminMaxMintsInPeriodChanged(event: AdminMaxMintsInPeriodChanged): void {
    log.info("Minting factory - handleAdminMaxMintsInPeriodChanged() called", []);
    let config = platformConfig.getPlatformConfig();
    config.maxMintsInPeriod = event.params._maxMintsInPeriod;
    config.save()
}

export function handleAdminFrequencyOverrideChanged(event: AdminFrequencyOverrideChanged): void {
    log.info("Minting factory - handleAdminFrequencyOverrideChanged() called", []);

    let artistEntity = artistService.loadOrCreateArtist(event.params._account);
    artistEntity.save()

    const config = ArtistMintingConfig.load(artistEntity.mintingConfig)
    config.frequencyOverride = event.params._override;
    config.save()
}
