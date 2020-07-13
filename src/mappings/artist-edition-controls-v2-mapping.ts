import {getKnownOriginForAddress} from "../services/KnownOrigin.factory";
import {loadOrCreateEdition} from "../services/Edition.service";
import {loadOrCreateToken} from "../services/Token.service";
import {MAX_UINT_256} from "../constants";
import {BigInt, log, ethereum} from "@graphprotocol/graph-ts/index";
import {PriceChanged, EditionGifted} from "../../generated/ArtistEditionControlsV2/ArtistEditionControlsV2";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";

import {
    recordEditionGifted,
} from "../services/ActivityEvent.service";

export function handlePriceChangedEvent(event: PriceChanged): void {
    log.info("handlePriceChangedEvent() for edition [{}]", [event.params._editionNumber.toString()]);

    /*
        event PriceChanged(
            uint256 indexed _editionNumber,
            address indexed _artist,
            uint256 _priceInWei
        );
     */

    let contract = getKnownOriginForAddress(event.address)
    let editionNumber = event.params._editionNumber
    handleEditionPriceChange(contract, editionNumber, event.block, event.params._priceInWei)
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

    let contract = getKnownOriginForAddress(event.address)
    let editionNumber = event.params._editionNumber

    let editionEntity = loadOrCreateEdition(editionNumber, event.block, contract)
    editionEntity.save()

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.save()

    recordEditionGifted(event, tokenEntity, editionEntity)
}

export function handleEditionPriceChange(contract: KnownOrigin, editionNumber: BigInt, block: ethereum.Block, priceInWei: BigInt): void {
    let editionEntity = loadOrCreateEdition(editionNumber, block, contract)
    editionEntity.priceInWei = priceInWei
    editionEntity.offersOnly = priceInWei.equals(MAX_UINT_256)
    editionEntity.save()
}
