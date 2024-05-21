import {
    Edition,
    ListedToken
} from "../../generated/schema";
import {BigInt, Bytes, log} from "@graphprotocol/graph-ts/index";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";

export function loadOrCreateListedToken(tokenId: string, edition: Edition): ListedToken {
    log.info("loadOrCreateListedToken() called  for token ID {}", [tokenId])

    let tokenIdAsBytes = Bytes.fromUTF8(tokenId);
    let listedToken = ListedToken.load(tokenIdAsBytes);

    if (listedToken == null) {
        listedToken = new ListedToken(tokenIdAsBytes);
        listedToken.version = edition.version;
        listedToken.editionNumber = ZERO.toString();

        listedToken.fullToken = tokenIdAsBytes;
        listedToken.listPrice = ZERO_BIG_DECIMAL;
        listedToken.lister = ZERO_ADDRESS;
        listedToken.listingTimestamp = ZERO;
        listedToken.revokedApproval = false;

        listedToken.metadataName = edition.metadataName;
        listedToken.metadataArtist = edition.metadataArtist;
        listedToken.metadataArtistAccount = edition.metadataArtistAccount;
        listedToken.metadataTagString = edition.metadataTagString;
        listedToken.primaryAssetShortType = edition.primaryAssetShortType ? edition.primaryAssetShortType as string : "";
        listedToken.primaryAssetActualType = edition.primaryAssetActualType ? edition.primaryAssetActualType as string : "";

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
