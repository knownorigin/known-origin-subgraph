import {log} from "@graphprotocol/graph-ts/index";

import {
    AdminUpdateArtistAccessMerkleRoot,
    AdminUpdateArtistAccessMerkleRootIpfsHash
} from "../../generated/KOAccessControls/KOAccessControls";
import {getAccessControls} from "../services/KOAccessControls.factory";

export function handleAdminUpdateArtistAccessMerkleRoot(event: AdminUpdateArtistAccessMerkleRoot): void {
    log.info("KO V3 handleAdminUpdateArtistAccessMerkleRoot() called - root {}", [event.params._artistAccessMerkleRoot.toString()]);
    let controls = getAccessControls();
    controls.merkleProofRoot = event.params._artistAccessMerkleRoot.toString();
    controls.save()
}

export function handleAdminUpdateArtistAccessMerkleRootIpfsHash(event: AdminUpdateArtistAccessMerkleRootIpfsHash): void {
    log.info("KO V3 handleAdminUpdateArtistAccessMerkleRootIpfsHash() called - hash {}", [event.params._artistAccessMerkleRootIpfsHash.toString()]);
    let controls = getAccessControls();
    controls.merkleProofIpfsHash = event.params._artistAccessMerkleRootIpfsHash;
    controls.save()
}
