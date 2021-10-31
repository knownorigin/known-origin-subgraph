import {log} from "@graphprotocol/graph-ts/index";

import {ArtistMintingConfig} from "../../../generated/schema";

import {
    AdminUpdateArtistAccessMerkleRoot,
    AdminUpdateArtistAccessMerkleRootIpfsHash
} from "../../../generated/KOAccessControls/KOAccessControls";

import {
    AdminMintingPeriodChanged,
    MintingFactoryCreated
} from "../../../generated/MintingFactoryConfig/MintingFactory";

import {
    AdminFrequencyOverrideChanged,
    AdminMaxMintsInPeriodChanged,
    MintingFactory
} from "../../../generated/MintingFactoryCreations/MintingFactory";

import * as platformConfig from "../../services/PlatformConfig.factory";
import * as artistService from "../../services/Artist.service";

export function handleAdminUpdateArtistAccessMerkleRoot(event: AdminUpdateArtistAccessMerkleRoot): void {
    log.info("KO V3 handleAdminUpdateArtistAccessMerkleRoot() called - root {}", [
        event.params._artistAccessMerkleRoot.toHexString()
    ]);
    let config = platformConfig.getPlatformConfig();
    config.merkleProofRoot = event.params._artistAccessMerkleRoot;
    config.save()
}

export function handleAdminUpdateArtistAccessMerkleRootIpfsHash(event: AdminUpdateArtistAccessMerkleRootIpfsHash): void {
    log.info("KO V3 handleAdminUpdateArtistAccessMerkleRootIpfsHash() called - hash {}", [
        event.params._artistAccessMerkleRootIpfsHash.toString()
    ]);
    let config = platformConfig.getPlatformConfig();
    config.merkleProofIpfsHash = event.params._artistAccessMerkleRootIpfsHash;
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
