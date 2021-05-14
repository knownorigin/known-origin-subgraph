import {
    Edition,
    ListedToken
} from "../../generated/schema";
import {BigInt, log} from "@graphprotocol/graph-ts/index";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";

export function loadOrCreateListedToken(tokenId: BigInt, edition: Edition): ListedToken {
    log.info("loadOrCreateListedToken() called  for token ID {}", [tokenId.toString()])

    let listedToken = ListedToken.load(tokenId.toString());

    if (listedToken == null) {
        listedToken = new ListedToken(tokenId.toString());
        listedToken.version = edition.version;
        listedToken.editionNumber = ZERO;

        listedToken.fullToken = tokenId.toString();
        listedToken.listPrice = ZERO_BIG_DECIMAL;
        listedToken.lister = ZERO_ADDRESS.toHexString();
        listedToken.listingTimestamp = ZERO;

        listedToken.metadataName = edition.metadataName;
        listedToken.metadataArtist = edition.metadataArtist;
        listedToken.metadataArtistAccount = edition.metadataArtistAccount;
        listedToken.metadataTagString = edition.metadataTagString;
        listedToken.primaryAssetShortType = edition.primaryAssetShortType || "";
        listedToken.primaryAssetActualType = edition.primaryAssetActualType || "";
        listedToken.save();
    }

    listedToken.editionNumber = edition.editionNmber;

    return listedToken as ListedToken;
}
