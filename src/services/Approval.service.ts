import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
import {Artist, Collector, Edition, ListedToken, Token} from "../../generated/schema";
import {ZERO_ADDRESS} from "../utils/constants";
import * as activityEventService from "../services/ActivityEvent.service";

export function handleSingleApproval(tokenId: BigInt, owner: Address, approved: Address, version: BigInt): void {
    let token: Token | null = Token.load(tokenId.toString())
    if (token != null && token.version.equals(version) && owner.equals(Address.fromString(token.currentOwner))) {
        token.revokedApproval = ZERO_ADDRESS.equals(approved);
        token.save()

        // TODO fire approval changed
    }

    let listedToken: ListedToken | null = ListedToken.load(tokenId.toString())
    if (listedToken != null && listedToken.version.equals(version) && owner.equals(Address.fromString(listedToken.lister))) {
        listedToken.revokedApproval = ZERO_ADDRESS.equals(approved);
        listedToken.save()
    }
}

export function handleArtistEditionsApprovalChanged(block: ethereum.Block, artistAddress: Address, approved: boolean, version: BigInt): void {
    log.info("handleArtistEditionsApprovalChanged() artist {} approval {}", [
        artistAddress.toHexString(),
        approved ? "TRUE" : "FALSE",
    ]);

    let artist: Artist | null = Artist.load(artistAddress.toHexString())
    if (artist != null && artist.isSet('editionIds')) {
        let editionIds = artist.editionIds
        for (let i = 0; i < editionIds.length; i++) {

            let editionId = editionIds[i];
            let edition = Edition.load(editionId);

            if (edition != null && edition.version.equals(version)) {
                log.info("handleArtistEditionsApprovalChanged() setting edition {} to revokedApproval {}", [
                    editionId.toString(),
                    (approved === false) ? "TRUE" : "FALSE"
                ]);
                edition.revokedApproval = (approved === false)
                edition.save()
            }
        }
    }
}

export function handleCollectorTokensApprovalChanged(block: ethereum.Block, collectorAddress: Address, approved: boolean, version: BigInt): void {
    let collector: Collector | null = Collector.load(collectorAddress.toHexString())

    if (collector != null && collector.isSet('tokenIds')) {
        let tokensIds = collector.tokenIds
        for (let i = 0; i < tokensIds.length; i++) {
            let tokenId = tokensIds[i];

            let token = Token.load(tokenId);
            if (token != null && token.version.equals(version)) {
                log.debug("handleCollectorTokensApprovalChanged() setting token {} to revokedApproval {}", [
                    tokenId.toString(),
                    (approved === false) ? "TRUE" : "FALSE"
                ]);
                token.revokedApproval = (approved === false)
                token.save()

                // TODO fire approval changed
            }

            let listedToken = ListedToken.load(tokenId);
            if (listedToken != null && listedToken.version.equals(version)) {
                log.debug("handleCollectorTokensApprovalChanged() setting listedToken {} to revokedApproval {}", [
                    tokenId.toString(),
                    (approved === false) ? "TRUE" : "FALSE"
                ]);
                listedToken.revokedApproval = (approved === false)
                listedToken.save()
            }
        }
    }
}
