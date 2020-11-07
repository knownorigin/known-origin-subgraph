import {
    ListedToken
} from "../../generated/schema";
import {BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {constructMetaData} from "./MetaData.service";
import {getArtistAddress} from "./AddressMapping.service";
import {splitMimeType} from "../utils";

export function loadOrCreateListedToken(
    tokenId: BigInt,
    editionNumber: BigInt,
    contract: KnownOrigin
): ListedToken | null {
    log.info("loadOrCreateListedToken() called for token ID {}", [tokenId.toString()])

    let listedToken = ListedToken.load(tokenId.toString());

    if (listedToken == null) {
        listedToken = new ListedToken(tokenId.toString());
        listedToken.listPrice = ZERO_BIG_DECIMAL;
        listedToken.lister = ZERO_ADDRESS.toHexString();
        listedToken.listingTimestamp = ZERO;
        listedToken.metadataName = "";
        listedToken.metadataArtist = "";
        listedToken.metadataArtistAccount = "";
        listedToken.metadataTagString = "";
        listedToken.primaryAssetShortType = "";
        listedToken.primaryAssetActualType = "";

        // try and actually populate metadata
        let _editionDataResult = contract.try_detailsOfEdition(editionNumber)
        if (!_editionDataResult.reverted) {
            let _editionData = _editionDataResult.value;
            let metaData = constructMetaData(_editionData.value7)

            listedToken.metadataName = metaData.name
            listedToken.metadataArtist = metaData.artist

            let artistAddress = getArtistAddress(_editionData.value4);
            listedToken.metadataArtistAccount = artistAddress.toHexString();

            if (metaData.image_type) {
                let types = splitMimeType(metaData.image_type)
                listedToken.primaryAssetShortType = types.primaryAssetShortType
                listedToken.primaryAssetActualType = types.primaryAssetActualType
            }

            if (metaData.tags != null && metaData.tags.length > 0) {
                listedToken.metadataTagString = metaData.tags.toString()
            }
        } else {
            log.error("Handled reverted detailsOfEdition() call for {}", [editionNumber.toString()]);
        }

        // let _optionalCommission = contract.try_editionOptionalCommission(editionNumber)
        // if (!_editionDataResult.reverted && _optionalCommission.value.value0 > ZERO) {
        //     listedToken.optionalCommissionAccount = getArtistAddress(_optionalCommission.value.value1).toHexString();
        // }

        listedToken.save();
    }

    return listedToken;
}
