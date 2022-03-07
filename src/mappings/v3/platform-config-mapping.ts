import {log} from "@graphprotocol/graph-ts/index";

import {
    AdminUpdateArtistAccessMerkleRoot,
    AdminUpdateArtistAccessMerkleRootIpfsHash
} from "../../../generated/KOAccessControls/KOAccessControls";

import * as platformConfig from "../../services/PlatformConfig.factory";

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
