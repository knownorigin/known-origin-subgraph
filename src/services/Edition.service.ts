import {BigInt, ethereum, log, Address, Bytes} from "@graphprotocol/graph-ts";
import {KnownOriginV2, KnownOriginV2__detailsOfEditionResult} from "../../generated/KnownOriginV2/KnownOriginV2";
import {BatchCreatorContract} from "../../generated/KnownOriginV4Factory/BatchCreatorContract";
import {Edition} from "../../generated/schema";
import {MAX_UINT_256, ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";
import {constructMetaData} from "./MetaData.service";
import {getArtistAddress} from "./AddressMapping.service";
import {isEditionBurnt} from "./burnt-editions";
import {loadOrCreateArtist} from "./Artist.service";
import {splitMimeType} from "../utils/utils";
import {KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";
import * as SaleTypes from "../utils/SaleTypes";
import * as KodaVersions from "../utils/KodaVersions";

function totalAvailable(editionNumber: BigInt, totalAvailable: BigInt): BigInt {
    // These editions have be modified since creation but before we had events, this is to fix a long standing
    // issue and to prevent us from using callHandlers which are incredible slow.
    // Note: This is only needed for KODA V2
    if (editionNumber.equals(BigInt.fromI32(21300))) {
        return BigInt.fromI32(1)
    }
    if (editionNumber.equals(BigInt.fromI32(21200))) {
        return BigInt.fromI32(1)
    }
    return totalAvailable;
}

export function loadOrCreateV2Edition(editionNumber: BigInt, block: ethereum.Block, contract: KnownOriginV2): Edition {
    let editionEntity = Edition.load(editionNumber.toString());

    if (editionEntity == null) {
        editionEntity = createDefaultEdition(KodaVersions.KODA_V2, editionNumber, block, editionNumber.toString());

        let _editionDataResult: ethereum.CallResult<KnownOriginV2__detailsOfEditionResult> = contract.try_detailsOfEdition(editionNumber)

        if (!_editionDataResult.reverted) {
            let _editionData = _editionDataResult.value;
            editionEntity.version = KodaVersions.KODA_V2
            editionEntity.editionData = _editionData.value0
            editionEntity.editionType = _editionData.value1
            editionEntity.salesType = SaleTypes.BUY_NOW
            editionEntity.startDate = _editionData.value2
            editionEntity.endDate = _editionData.value3
            editionEntity.artistAccount = getArtistAddress(_editionData.value4)
            editionEntity.artistCommission = _editionData.value5
            editionEntity.priceInWei = _editionData.value6
            editionEntity.metadataPrice = _editionData.value6
            editionEntity.tokenURI = _editionData.value7
            editionEntity.totalSupply = _editionData.value8
            editionEntity.totalAvailable = totalAvailable(editionNumber, _editionData.value9)
            editionEntity.originalEditionSize = _editionData.value9
            editionEntity.remainingSupply = editionEntity.totalAvailable // set to initial supply
            editionEntity.active = _editionData.value10
            editionEntity.offersOnly = _editionData.value6.equals(MAX_UINT_256)

            // Define sales type
            if (editionEntity.offersOnly) {
                editionEntity.salesType = SaleTypes.OFFERS_ONLY
            }

            let artistsAccount = Address.fromString(editionEntity.artistAccount.toHexString());

            // Add artist
            let artistEntity = loadOrCreateArtist(artistsAccount);
            artistEntity.save()
            editionEntity.artist = artistEntity.id

            // Specify collabs
            let collaborators: Array<Bytes> = editionEntity.collaborators
            collaborators.push(editionEntity.artistAccount)

            let _optionalCommission = contract.try_editionOptionalCommission(editionNumber)
            if (!_editionDataResult.reverted && _optionalCommission.value.value0 > ZERO) {
                editionEntity.optionalCommissionRate = _optionalCommission.value.value0
                editionEntity.optionalCommissionAccount = getArtistAddress(_optionalCommission.value.value1)
                collaborators.push(getArtistAddress(_optionalCommission.value.value1))
            }

            editionEntity.collaborators = collaborators

            // Set genesis flag
            let artistEditions = contract.artistsEditions(artistsAccount);
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

                editionEntity.metadataName = metaData.name ? metaData.name : ''
                editionEntity.metadataArtist = metaData.artist ? metaData.artist : ''
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

    return editionEntity as Edition;
}

export function loadOrCreateV2EditionFromTokenId(tokenId: BigInt, block: ethereum.Block, contract: KnownOriginV2): Edition {
    log.info("loadOrCreateV2EditionFromTokenId() called for tokenId [{}]", [tokenId.toString()]);
    let _editionNumber = contract.editionOfTokenId(tokenId);
    return loadOrCreateV2Edition(_editionNumber, block, contract);
}

//////////////
// V3 stuff //
//////////////

export function loadNonNullableEdition(editionNumber: BigInt): Edition {
    return Edition.load(editionNumber.toString()) as Edition
}

export function loadOrCreateV3EditionFromTokenId(tokenId: BigInt, block: ethereum.Block, kodaV3Contract: KnownOriginV3): Edition {
    log.info("Calling loadOrCreateV3EditionFromTokenId() call for token ID {} ", [tokenId.toString()])

    //(address _originalCreator, address _owner, uint16 _size, uint256 _editionId, string memory _uri)
    let editionDetails = kodaV3Contract.getEditionDetails(tokenId);
    let _originalCreator = editionDetails.value0;
    let _size = BigInt.fromI32(editionDetails.value2);
    let _editionId = editionDetails.value3;
    let _uri = editionDetails.value4;

    return buildEdition(_editionId, _originalCreator, _size, _uri, block, kodaV3Contract)
}

export function loadOrCreateV3Edition(_editionId: BigInt, block: ethereum.Block, kodaV3Contract: KnownOriginV3): Edition {
    log.info("Calling loadOrCreateV3Edition() call for edition ID {} ", [_editionId.toString()])

    let _originalCreator = kodaV3Contract.getCreatorOfEdition(_editionId);
    let _size = kodaV3Contract.getSizeOfEdition(_editionId);
    let _uri = kodaV3Contract.editionURI(_editionId);

    return buildEdition(_editionId, _originalCreator, _size, _uri, block, kodaV3Contract);
}

export function loadOrCreateV4Edition(_editionId: BigInt, block: ethereum.Block, contractAddress: Address, isHidden: boolean): Edition {
    log.info("Calling loadOrCreateV4Edition() call for edition ID {} ", [_editionId.toString()])

    let contractInstance = BatchCreatorContract.bind(contractAddress)
    let originalCreator = contractInstance.editionCreator(_editionId)
    let size = contractInstance.editionSize(_editionId)
    let uri = contractInstance.editionURI(_editionId)

    return buildV4Edition(_editionId, originalCreator, size, uri, block, contractAddress, isHidden);
}

export function loadOrCreateV4EditionFromTokenId(tokenId: BigInt, block: ethereum.Block, contractAddress: Address, isHidden: boolean): Edition {
    log.info("Calling loadOrCreateV4EditionFromTokenId() call for token ID {} ", [tokenId.toString()])

    let contractInstance = BatchCreatorContract.bind(contractAddress)
    let _editionId = contractInstance.tokenEditionId(tokenId)
    let originalCreator = contractInstance.editionCreator(_editionId)
    let size = contractInstance.editionSize(_editionId)
    let uri = contractInstance.editionURI(_editionId)

    return buildV4Edition(_editionId, originalCreator, size, uri, block, contractAddress, isHidden);
}

function buildEdition(_editionId: BigInt, _originalCreator: Address, _size: BigInt, _uri: string, block: ethereum.Block, kodaV3Contract: KnownOriginV3): Edition {
    let editionEntity = Edition.load(_editionId.toString());
    if (editionEntity == null) {
        editionEntity = createDefaultEdition(KodaVersions.KODA_V3, _editionId, block, _editionId.toString());

        editionEntity.version = KodaVersions.KODA_V3
        editionEntity.editionType = ONE
        editionEntity.startDate = ZERO
        editionEntity.endDate = MAX_UINT_256
        editionEntity.artistCommission = BigInt.fromI32(85)
        editionEntity.artistAccount = _originalCreator
        editionEntity.tokenURI = _uri
        editionEntity.totalSupply = ZERO
        editionEntity.totalAvailable = _size
        editionEntity.originalEditionSize = _size
        editionEntity.remainingSupply = editionEntity.totalAvailable // set to initial supply
        editionEntity.active = true;

        // if we have reported this edition, assume its disabled
        if (kodaV3Contract.reportedEditionIds(_editionId)) {
            log.debug("Edition {} reported - setting edition to inactive", [_editionId.toString()]);
            editionEntity.active = false
        }

        // if this artist has been reported, always disable their work
        if (kodaV3Contract.reportedArtistAccounts(_originalCreator)) {
            log.debug("Artist {} reported - setting edition {} to inactive", [
                _originalCreator.toHexString(),
                _editionId.toString()
            ]);
            editionEntity.active = false
        }

        if (isEditionBurnt(_editionId)) {
            log.debug("Edition in hardcoded burn list {} setting to inactive", [_editionId.toString()]);
            editionEntity.active = false
        }

        // add creator to collaborators list
        let collaborators: Array<Bytes> = editionEntity.collaborators
        collaborators.push(editionEntity.artistAccount)
        editionEntity.collaborators = collaborators

        // Pricing logic
        editionEntity.offersOnly = false

        // Set genesis flag if not existing editions created
        let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()))
        editionEntity.artist = artist.id.toString()

        let metaData = constructMetaData(_editionId, _uri)
        if (metaData != null) {
            metaData.save()
            editionEntity.metadata = metaData.id
            editionEntity.metadataFormat = metaData.format
            editionEntity.metadataTheme = metaData.theme
            editionEntity.metadataName = metaData.name ? metaData.name : ""
            editionEntity.metadataArtist = metaData.artist ? metaData.artist : ""
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
    }
    return editionEntity as Edition;
}

function buildV4Edition(_editionId: BigInt, _originalCreator: Address, _size: BigInt, _uri: string, block: ethereum.Block, address: Address, isHidden: boolean): Edition {
    let entityId = _editionId.toString() + "-" + address.toHexString()
    let editionEntity = Edition.load(entityId);
    if (editionEntity == null) {
        editionEntity = createDefaultEdition(KodaVersions.KODA_V4, _editionId, block, entityId);

        editionEntity.version = KodaVersions.KODA_V4
        editionEntity.editionType = ONE
        editionEntity.startDate = ZERO
        editionEntity.endDate = MAX_UINT_256
        editionEntity.artistCommission = BigInt.fromI32(85)
        editionEntity.artistAccount = _originalCreator
        editionEntity.tokenURI = _uri
        editionEntity.totalSupply = ZERO
        editionEntity.totalAvailable = _size
        editionEntity.originalEditionSize = _size
        editionEntity.remainingSupply = editionEntity.totalAvailable
        editionEntity.active = true;

        editionEntity.editionContract = address

        // if we have reported the creator contract, assume its disabled
        if (isHidden) {
            log.debug("Creator contract {} reported - setting edition to inactive", [address.toHexString()]);
            editionEntity.active = false
        }

        if (isEditionBurnt(_editionId)) {
            log.debug("Edition in hardcoded burn list {} setting to inactive", [_editionId.toString()]);
            editionEntity.active = false
        }

        // add creator to collaborators list
        let collaborators: Array<Bytes> = editionEntity.collaborators
        collaborators.push(editionEntity.artistAccount)
        editionEntity.collaborators = collaborators

        // Pricing logic
        editionEntity.offersOnly = false

        // Set genesis flag if not existing editions created
        let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()))
        editionEntity.artist = artist.id.toString()

        let metaData = constructMetaData(_editionId, _uri)
        if (metaData != null) {
            metaData.save()
            editionEntity.metadata = metaData.id
            editionEntity.metadataFormat = metaData.format
            editionEntity.metadataTheme = metaData.theme
            editionEntity.metadataName = metaData.name ? metaData.name : ""
            editionEntity.metadataArtist = metaData.artist ? metaData.artist : ""
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
    }
    return editionEntity as Edition;
}

function createDefaultEdition(version: BigInt, _editionId: BigInt, block: ethereum.Block, entityId: string): Edition {
    // Unfortunately there is some dodgy data on rinkeby which means some calls fail so we default everything to blank to avoid failures on reverts on rinkeby
    let editionEntity = new Edition(entityId);
    editionEntity.version = version
    editionEntity.editionNmber = _editionId
    editionEntity.salesType = SaleTypes.OFFERS_ONLY
    editionEntity.tokenIds = new Array<BigInt>()
    editionEntity.auctionEnabled = false
    editionEntity.activeBid = null
    editionEntity.biddingHistory = new Array<string>()
    editionEntity.sales = new Array<string>()
    editionEntity.transfers = new Array<string>()
    editionEntity.allOwners = new Array<string>()
    editionEntity.currentOwners = new Array<string>()
    editionEntity.primaryOwners = new Array<string>()
    editionEntity.collaborators = new Array<Bytes>()
    editionEntity.totalEthSpentOnEdition = ZERO_BIG_DECIMAL
    editionEntity.totalSold = ZERO
    editionEntity.totalBurnt = ZERO
    editionEntity.originalEditionSize = ZERO
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
    editionEntity.isEnhancedEdition = false
    editionEntity.hasCoverImage = false
    editionEntity.stepSaleBasePrice = ZERO
    editionEntity.stepSaleStepPrice = ZERO
    editionEntity.currentStep = ZERO
    editionEntity.revokedApproval = false

    // Reserve auction fields
    editionEntity.reserveAuctionSeller = ZERO_ADDRESS
    editionEntity.reserveAuctionBidder = ZERO_ADDRESS
    editionEntity.reservePrice = ZERO
    editionEntity.reserveAuctionBid = ZERO
    editionEntity.reserveAuctionStartDate = ZERO
    editionEntity.previousReserveAuctionEndTimestamp = ZERO
    editionEntity.reserveAuctionEndTimestamp = ZERO
    editionEntity.reserveAuctionNumTimesExtended = ZERO
    editionEntity.reserveAuctionTotalExtensionLengthInSeconds = ZERO
    editionEntity.isReserveAuctionResulted = false
    editionEntity.reserveAuctionResulter = ZERO_ADDRESS
    editionEntity.reserveAuctionCanEmergencyExit = false
    editionEntity.isReserveAuctionResultedDateTime = ZERO
    editionEntity.isReserveAuctionInSuddenDeath = false

    // set to empty string for text string although Ford is fixing this for us to handle nulls
    editionEntity.metadataName = ""
    editionEntity.metadataTagString = ""
    editionEntity.metadataArtist = ""
    editionEntity.metadataArtistAccount = "";
    editionEntity.metadataPrice = ZERO

    return editionEntity
}
