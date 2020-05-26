import {BigInt, ethereum, log} from "@graphprotocol/graph-ts/index";
import {Token} from "../../generated/schema";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {KnownOrigin, KnownOrigin__detailsOfEditionResult} from "../../generated/KnownOrigin/KnownOrigin";
import {constructMetaData} from "./MetaData.service";
import {loadOrCreateCollector} from "./Collector.service";
import {getArtistAddress} from "./AddressMapping.service";

export function loadOrCreateToken(tokenId: BigInt, contract: KnownOrigin, block: ethereum.Block): Token | null {
    log.error("Calling loadOrCreateToken() call for {}", [tokenId.toString()])

    let tokenEntity = Token.load(tokenId.toString())

    if (tokenEntity == null) {
        // FIXME make this use try_tokenData()

        let _tokenData = contract.tokenData(tokenId)
        tokenEntity = new Token(tokenId.toString())
        tokenEntity.transfers = new Array<string>()
        tokenEntity.allOwners = new Array<string>()
        tokenEntity.openOffer = null
        tokenEntity.tokenEvents = new Array<string>()

        // Entity fields can be set using simple assignments
        tokenEntity.transferCount = ZERO // set up the owner count
        tokenEntity.tokenId = tokenId
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.tokenURI = _tokenData.value3

        let collector = loadOrCreateCollector(_tokenData.value4, block);
        collector.save();

        tokenEntity.currentOwner = collector.id

        tokenEntity.birthTimestamp = ZERO
        tokenEntity.lastTransferTimestamp = ZERO
        tokenEntity.primaryValueInEth = ZERO_BIG_DECIMAL
        tokenEntity.lastSalePriceInEth = ZERO_BIG_DECIMAL

        tokenEntity.editionTotalAvailable = ZERO
        tokenEntity.editionActive = true
        tokenEntity.artistAccount = ZERO_ADDRESS

        let metaData = constructMetaData(_tokenData.value3);
        metaData.save()
        tokenEntity.metadata = metaData.id

        let _editionDataResult: ethereum.CallResult<KnownOrigin__detailsOfEditionResult> = contract.try_detailsOfEdition(tokenEntity.editionNumber)

        if (!_editionDataResult.reverted) {
            let _editionData = _editionDataResult.value;

            tokenEntity.editionTotalAvailable = _editionData.value9
            tokenEntity.editionActive = _editionData.value10

            tokenEntity.artistAccount = getArtistAddress(_editionData.value4)

        } else {
            log.error("Handled reverted detailsOfEdition() call for {}", [tokenEntity.editionNumber.toString()])
        }

        tokenEntity.save();
    }

    return tokenEntity;
}
