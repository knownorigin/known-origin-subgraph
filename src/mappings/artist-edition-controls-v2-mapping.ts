import {getKnownOriginV2ForAddress} from "../services/KnownOrigin.factory";
import {loadOrCreateV2Edition} from "../services/Edition.service";
import {loadOrCreateToken} from "../services/Token.service";
import {MAX_UINT_256} from "../constants";
import {BigInt, log, ethereum} from "@graphprotocol/graph-ts/index";
import {PriceChanged, EditionGifted} from "../../generated/ArtistEditionControlsV2/ArtistEditionControlsV2";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";

import {
    recordEditionGifted, recordPriceChanged,
} from "../services/ActivityEvent.service";
import {Edition} from "../../generated/schema";

export function handlePriceChangedEvent(event: PriceChanged): void {
    log.info("handlePriceChangedEvent() for edition [{}]", [event.params._editionNumber.toString()]);

    /*
        event PriceChanged(
            uint256 indexed _editionNumber,
            address indexed _artist,
            uint256 _priceInWei
        );
     */

    let contract = getKnownOriginV2ForAddress(event.address)
    let editionNumber = event.params._editionNumber
    let editionEntity = handleEditionPriceChange(contract, editionNumber, event.block, event.params._priceInWei)

    recordPriceChanged(event, editionEntity, event.params._priceInWei)
}

export function handleEditionGiftedEvent(event: EditionGifted): void {
    log.info("handleEditionGiftedEvent() for edition [{}]", [event.params._editionNumber.toString()]);

    /*
          event EditionGifted(
            uint256 indexed _editionNumber,
            address indexed _artist,
            uint256 indexed _tokenId
          );
     */

    let contract = getKnownOriginV2ForAddress(event.address)
    let editionNumber = event.params._editionNumber

    let editionEntity = loadOrCreateV2Edition(editionNumber, event.block, contract)
    editionEntity.save()

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.save()

    recordEditionGifted(event, tokenEntity, editionEntity)
}

export function handleEditionPriceChange(contract: KnownOrigin, editionNumber: BigInt, block: ethereum.Block, priceInWei: BigInt): Edition | null  {
    let editionEntity = loadOrCreateV2Edition(editionNumber, block, contract)
    editionEntity.priceInWei = priceInWei
    editionEntity.offersOnly = priceInWei.equals(MAX_UINT_256)
    editionEntity.save()
    return editionEntity
}
