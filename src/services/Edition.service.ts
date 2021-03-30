import {BigInt, ethereum, log, Address} from "@graphprotocol/graph-ts";
import {KnownOrigin, KnownOrigin__detailsOfEditionResult} from "../../generated/KnownOrigin/KnownOrigin";
import {Edition} from "../../generated/schema";
import {MAX_UINT_256, ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {constructMetaData} from "./MetaData.service";
import {getArtistAddress} from "./AddressMapping.service";
import {isEditionBurnt} from "./burnt-editions";
import {loadOrCreateArtist} from "./Artist.service";
import {splitMimeType} from "../utils";

export function loadOrCreateEdition(editionNumber: BigInt, block: ethereum.Block, contract: KnownOrigin): Edition | null {
    let editionEntity: Edition | null = Edition.load(editionNumber.toString());

    if (editionEntity == null) {

        // Unfortunately there is some dodgy data on rinkeby which means some calls fail so we default everything to blank to avoid failures on reverts on rinkeby
        editionEntity = new Edition(editionNumber.toString());
        editionEntity.editionNmber = editionNumber
        editionEntity.tokenIds = new Array<BigInt>()
        editionEntity.auctionEnabled = false
        editionEntity.activeBid = null
        editionEntity.biddingHistory = new Array<string>()
        editionEntity.sales = new Array<string>()
        editionEntity.transfers = new Array<string>()
        editionEntity.allOwners = new Array<string>()
        editionEntity.currentOwners = new Array<string>()
        editionEntity.primaryOwners = new Array<string>()
        editionEntity.totalEthSpentOnEdition = ZERO_BIG_DECIMAL
        editionEntity.totalSold = ZERO
        editionEntity.createdTimestamp = block.timestamp
        editionEntity.editionType = ZERO
        editionEntity.startDate = ZERO
        editionEntity.endDate = ZERO
        editionEntity.artistAccount = ZERO_ADDRESS
        editionEntity.artistCommission = ZERO
        editionEntity.priceInWei = ZERO
        editionEntity.tokenURI = ""
        editionEntity.totalSupply = ZERO
        editionEntity.totalAvailable = ZERO
        editionEntity.remainingSupply = ZERO
        editionEntity.active = false
        editionEntity.offersOnly = false
        editionEntity.isGenesisEdition = false
        editionEntity.hasCoverImage = false

        // set to empty string for text string although Ford is fixing this for us to handle nulls
        editionEntity.metadataName = ""
        editionEntity.metadataTagString = ""
        editionEntity.metadataArtist = ""
        editionEntity.metadataArtistAccount = "";

        let _editionDataResult: ethereum.CallResult<KnownOrigin__detailsOfEditionResult> = contract.try_detailsOfEdition(editionNumber)

        if (!_editionDataResult.reverted) {
            let _editionData = _editionDataResult.value;
            editionEntity.editionData = _editionData.value0
            editionEntity.editionType = _editionData.value1
            editionEntity.startDate = _editionData.value2
            editionEntity.endDate = _editionData.value3
            editionEntity.artistAccount = getArtistAddress(_editionData.value4)
            editionEntity.artistCommission = _editionData.value5
            editionEntity.priceInWei = _editionData.value6
            editionEntity.tokenURI = _editionData.value7
            editionEntity.totalSupply = _editionData.value8
            editionEntity.totalAvailable = _editionData.value9
            editionEntity.remainingSupply = editionEntity.totalAvailable // set to initial supply
            editionEntity.active = _editionData.value10
            editionEntity.offersOnly = _editionData.value6.equals(MAX_UINT_256)

            let _optionalCommission = contract.try_editionOptionalCommission(editionNumber)
            if (!_editionDataResult.reverted && _optionalCommission.value.value0 > ZERO) {
                editionEntity.optionalCommissionRate = _optionalCommission.value.value0
                editionEntity.optionalCommissionAccount = getArtistAddress(_optionalCommission.value.value1)
            }

            // Set genesis flag
            let artistEditions = contract.artistsEditions(Address.fromString(editionEntity.artistAccount.toHexString()));
            if (artistEditions.length === 1) {
                log.info("Setting isGenesisEdition TRUE for artist {} on edition {} total found {} ", [
                    editionEntity.artistAccount.toHexString(),
                    editionNumber.toString(),
                    BigInt.fromI32(artistEditions.length).toString()
                ]);
                editionEntity.isGenesisEdition = true
            }

            let metaData = constructMetaData(editionNumber, _editionData.value7)

            if (metaData != null) {
                metaData.save()
                editionEntity.metadata = metaData.id

                editionEntity.metadataName = metaData.name
                editionEntity.metadataArtist = metaData.artist
                editionEntity.metadataArtistAccount = editionEntity.artistAccount.toHexString()
                if (metaData.image_type) {
                    let types = splitMimeType(metaData.image_type)
                    editionEntity.primaryAssetShortType = types.primaryAssetShortType
                    editionEntity.primaryAssetActualType = types.primaryAssetActualType
                }
                editionEntity.hasCoverImage = metaData.cover_image !== null;
                if (metaData.tags != null && metaData.tags.length > 0) {
                    editionEntity.metadataTagString = metaData.tags.toString()
                }
            }
        } else {
            log.error("Handled reverted detailsOfEdition() call for {}", [editionNumber.toString()]);
        }
    }

    // Check static list of know burnt editions
    let isBurnt = isEditionBurnt(editionNumber);
    // If burnt and not already inactive - make edition burnt
    if (isBurnt && editionEntity.active) {
        log.warning("isEditionBurnt() true for edition [{}] ", [editionNumber.toString()]);
        editionEntity.active = false
        editionEntity.totalAvailable = ZERO

        let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
        artist.editionsCount = artist.editionsCount.minus(ONE);
        artist.supply = artist.supply.minus(editionEntity.totalAvailable);
        artist.save()
    }

    return editionEntity;
}

export function loadEdition(editionNumber: BigInt): Edition | null {
    return Edition.load(editionNumber.toString())
}

export function loadOrCreateEditionFromTokenId(tokenId: BigInt, block: ethereum.Block, contract: KnownOrigin): Edition | null {
    log.info("loadOrCreateEditionFromTokenId() called for tokenId [{}]", [tokenId.toString()]);
    let _editionNumber = contract.editionOfTokenId(tokenId);
    return loadOrCreateEdition(_editionNumber, block, contract);
}
