import {
    Edition,
    ListedToken, Token
} from "../../generated/schema";
import {BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {constructMetaData} from "./MetaData.service";
import {getArtistAddress} from "./AddressMapping.service";
import {splitMimeType} from "../utils";

export function loadOrCreateListedToken(
    tokenId: BigInt,
    edition: Edition | null
): ListedToken | null {
    log.info("loadOrCreateListedToken() called  for token ID {}", [tokenId.toString()])

    let listedToken = ListedToken.load(tokenId.toString());

    if (listedToken == null) {
        listedToken = new ListedToken(tokenId.toString());
        listedToken.fullToken = tokenId.toString();
        listedToken.listPrice = ZERO_BIG_DECIMAL;
        listedToken.lister = ZERO_ADDRESS.toHexString();
        listedToken.listingTimestamp = ZERO;

        // copy over fields from edition metadata
        if (edition) { // in reality this would not be null
            listedToken.metadataName = edition.metadataName;
            listedToken.metadataArtist = edition.metadataArtist;
            listedToken.metadataArtistAccount = edition.metadataArtistAccount;
            listedToken.metadataTagString = edition.metadataTagString;
            listedToken.primaryAssetShortType = edition.primaryAssetShortType;
            listedToken.primaryAssetActualType = edition.primaryAssetActualType;
        }
        listedToken.save();
    }

    return listedToken;
}
