import {Address, BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
import {Edition, Token} from "../../generated/schema";
import {ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";
import {
    KnownOriginV2,
    KnownOriginV2__detailsOfEditionResult,
    KnownOriginV2__tokenDataResult
} from "../../generated/KnownOriginV2/KnownOriginV2";
import {constructMetaData} from "./MetaData.service";
import {loadOrCreateCollector} from "./Collector.service";
import {getArtistAddress} from "./AddressMapping.service";
import * as KodaVersions from "../utils/KodaVersions";
import {KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";
import * as SaleTypes from "../utils/SaleTypes";
import {toEther} from "../utils/utils";

function newTokenEntity(tokenId: BigInt, version: BigInt, entityId: string): Token {
    log.info("Calling newTokenEntity() call for {} ", [entityId])

    let tokenEntity = new Token(entityId)
    tokenEntity.version = version
    tokenEntity.transfers = new Array<string>()
    tokenEntity.allOwners = new Array<string>()
    tokenEntity.openOffer = null
    tokenEntity.tokenEvents = new Array<string>()
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY

    // Entity fields can be set using simple assignments
    tokenEntity.transferCount = ZERO // set up the owner count
    tokenEntity.tokenId = tokenId
    tokenEntity.editionNumber = ZERO
    tokenEntity.tokenURI = ""
    tokenEntity.birthTimestamp = ZERO
    tokenEntity.lastTransferTimestamp = ZERO
    tokenEntity.primaryValueInEth = ZERO_BIG_DECIMAL
    tokenEntity.lastSalePriceInEth = ZERO_BIG_DECIMAL
    tokenEntity.totalPurchaseValue = ZERO_BIG_DECIMAL
    tokenEntity.totalPurchaseCount = ZERO
    tokenEntity.largestSecondaryValueInEth = ZERO_BIG_DECIMAL
    tokenEntity.largestSalePriceEth = ZERO_BIG_DECIMAL
    tokenEntity.editionActive = true
    tokenEntity.artistAccount = ZERO_ADDRESS
    tokenEntity.isListed = false
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY
    tokenEntity.listPrice = ZERO_BIG_DECIMAL
    tokenEntity.lister = null
    tokenEntity.listingTimestamp = ZERO
    tokenEntity.revokedApproval = false

    return tokenEntity
}

function attemptToLoadV2TokenData(contract: KnownOriginV2, block: ethereum.Block, tokenId: BigInt, tokenEntity: Token | null): Token | null {
    log.info("Calling attemptToLoadV2TokenData() call for {} ", [tokenId.toString()])

    let _tokenDataResult: ethereum.CallResult<KnownOriginV2__tokenDataResult> = contract.try_tokenData(tokenId)
    if (!_tokenDataResult.reverted) {
        let _tokenData = _tokenDataResult.value;
        tokenEntity.version = KodaVersions.KODA_V2
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.edition = _tokenData.value0.toString()
        tokenEntity.tokenURI = _tokenData.value3

        let collector = loadOrCreateCollector(_tokenData.value4, block);
        collector.save();
        tokenEntity.currentOwner = collector.id

        let metaData = constructMetaData(_tokenData.value0, _tokenData.value3);
        metaData.save()
        tokenEntity.metadata = metaData.id

        let _editionDataResult: ethereum.CallResult<KnownOriginV2__detailsOfEditionResult> = contract.try_detailsOfEdition(tokenEntity.editionNumber)
        if (!_editionDataResult.reverted) {
            let _editionData = _editionDataResult.value;
            tokenEntity.editionActive = _editionData.value10
            tokenEntity.artistAccount = getArtistAddress(_editionData.value4)
        } else {
            log.error("Handled reverted  detailsOfEdition() call for {}", [tokenEntity.editionNumber.toString()])
            return null;
        }
    } else {
        log.error("Handled reverted tokenData() call for ... why? {}", [tokenId.toString()])
        return null;
    }
    return tokenEntity;
}

export function loadOrCreateV2Token(tokenId: BigInt, contract: KnownOriginV2, block: ethereum.Block): Token {
    log.info("Calling loadOrCreateV2Token() call for {} ", [tokenId.toString()])

    let tokenEntity = Token.load(tokenId.toString())

    if (tokenEntity == null) {
        // Create new instance
        tokenEntity = newTokenEntity(tokenId, KodaVersions.KODA_V2, tokenId.toString())

        // Populate it
        tokenEntity = attemptToLoadV2TokenData(contract, block, tokenId, tokenEntity);
        tokenEntity.save();
    }
    return tokenEntity as Token;
}

export function loadNonNullableToken(tokenId: BigInt): Token {
    log.info("Calling loadNonNullableToken() call for {} ", [tokenId.toString()])
    return Token.load(tokenId.toString()) as Token;
}

///////////////
// V3 tokens //
///////////////

function attemptToLoadV3TokenData(contract: KnownOriginV3, block: ethereum.Block, tokenId: BigInt, tokenEntity: Token): Token {
    log.info("Calling attemptToLoadV3TokenData() call for {} ", [tokenId.toString()])

    // address _originalCreator, address _owner, uint16 _size, uint256 _editionId, string memory _uri
    let editionDetails = contract.getEditionDetails(tokenId);
    let editionNumber = contract.getEditionIdOfToken(tokenId);
    let tokenURI = contract.tokenURI(tokenId);
    let ownerOf = contract.ownerOf(tokenId);

    tokenEntity.version = KodaVersions.KODA_V3
    tokenEntity.editionNumber = editionNumber
    tokenEntity.edition = editionNumber.toString()
    tokenEntity.tokenURI = tokenURI

    let collector = loadOrCreateCollector(ownerOf, block);
    collector.save();
    tokenEntity.currentOwner = collector.id

    let metaData = constructMetaData(editionNumber, tokenURI);
    metaData.save()
    tokenEntity.metadata = metaData.id

    tokenEntity.editionActive = contract.reportedEditionIds(editionNumber)
    tokenEntity.artistAccount = editionDetails.value0

    return tokenEntity;
}

export function loadOrCreateV3Token(tokenId: BigInt, contract: KnownOriginV3, block: ethereum.Block): Token {
    log.info("Calling loadOrCreateV3Token() call for {} ", [tokenId.toString()])

    let tokenEntity = Token.load(tokenId.toString())

    if (tokenEntity == null) {
        // Create new instance
        tokenEntity = newTokenEntity(tokenId, KodaVersions.KODA_V3, tokenId.toString())

        // Populate it
        tokenEntity = attemptToLoadV3TokenData(contract, block, tokenId, tokenEntity as Token);
        tokenEntity.save();
    }

    return tokenEntity as Token;
}

function attemptToLoadV4TokenData(tokenEntity: Token, edition: Edition, block: ethereum.Block): Token {
    tokenEntity.salesType = edition.salesType
    tokenEntity.transferCount = ONE
    tokenEntity.editionNumber = edition.editionNmber
    tokenEntity.edition = edition.id
    tokenEntity.tokenURI = edition.tokenURI
    tokenEntity.metadata = edition.metadata
    tokenEntity.birthTimestamp = block.timestamp
    tokenEntity.lastTransferTimestamp = block.timestamp
    tokenEntity.editionActive = edition.active
    return tokenEntity
}

export function loadOrCreateV4Token(tokenId: BigInt, contractAddress: Address, edition: Edition, block: ethereum.Block): Token {
    let entityId = tokenId.toString() + "-" + contractAddress.toHexString()
    log.info("Calling loadOrCreateV4Token() call for {} ", [entityId])

    let tokenEntity = Token.load(entityId);

    if (tokenEntity == null) {
        tokenEntity = newTokenEntity(tokenId, BigInt.fromString("4"), entityId);
        tokenEntity = attemptToLoadV4TokenData(tokenEntity as Token, edition, block);
    }

    return tokenEntity as Token;
}

export function recordTokenSaleMetrics(tokenEntity: Token, salePriceInWei: BigInt, isPrimarySale: boolean): Token {
    tokenEntity.lastSalePriceInEth = toEther(salePriceInWei)
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.totalPurchaseValue = tokenEntity.totalPurchaseValue.plus(toEther(salePriceInWei))

    if (isPrimarySale) {
        tokenEntity.primaryValueInEth = tokenEntity.lastSalePriceInEth
    } else {
        if (tokenEntity.largestSecondaryValueInEth < tokenEntity.lastSalePriceInEth) {
            tokenEntity.largestSecondaryValueInEth = tokenEntity.lastSalePriceInEth
        }
    }

    if (tokenEntity.largestSalePriceEth < tokenEntity.lastSalePriceInEth) {
        tokenEntity.largestSalePriceEth = tokenEntity.lastSalePriceInEth
    }

    return tokenEntity;
}
