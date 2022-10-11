import {
    Edition,
    ListedToken
} from "../../generated/schema";
import {BigInt, log} from "@graphprotocol/graph-ts/index";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";

export function loadOrCreateListedToken(tokenId: string, edition: Edition): ListedToken {
    log.info("loadOrCreateListedToken() called  for token ID {}", [tokenId])

    let listedToken = ListedToken.load(tokenId);

    if (listedToken == null) {
        listedToken = new ListedToken(tokenId);
        listedToken.version = edition.version;
        listedToken.editionNumber = ZERO;

        listedToken.fullToken = tokenId;
        listedToken.listPrice = ZERO_BIG_DECIMAL;
        listedToken.lister = ZERO_ADDRESS.toHexString();
        listedToken.listingTimestamp = ZERO;
        listedToken.revokedApproval = false;

        listedToken.metadataName = edition.metadataName;
        listedToken.metadataArtist = edition.metadataArtist;
        listedToken.metadataArtistAccount = edition.metadataArtistAccount;
        listedToken.metadataTagString = edition.metadataTagString;
        listedToken.primaryAssetShortType = edition.primaryAssetShortType || "";
        listedToken.primaryAssetActualType = edition.primaryAssetActualType || "";

        // Reserve auction fields
        listedToken.reserveAuctionSeller = ZERO_ADDRESS
        listedToken.reserveAuctionBidder = ZERO_ADDRESS
        listedToken.reservePrice = ZERO
        listedToken.reserveAuctionBid = ZERO
        listedToken.reserveAuctionStartDate = ZERO
        listedToken.previousReserveAuctionEndTimestamp = ZERO
        listedToken.reserveAuctionEndTimestamp = ZERO
        listedToken.reserveAuctionNumTimesExtended = ZERO
        listedToken.reserveAuctionTotalExtensionLengthInSeconds = ZERO
        listedToken.isReserveAuctionResulted = false
        listedToken.reserveAuctionResulter = ZERO_ADDRESS
        listedToken.reserveAuctionCanEmergencyExit = false
        listedToken.isReserveAuctionResultedDateTime = ZERO
        listedToken.isReserveAuctionInSuddenDeath = false

        listedToken.save();
    }

    listedToken.editionNumber = edition.editionNmber;

    return listedToken as ListedToken;
}
