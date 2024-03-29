import {getKnownOriginV2ForAddress} from "./KODAV2AddressLookup";

import {MAX_UINT_256} from "../../utils/constants";
import {BigInt, log, ethereum} from "@graphprotocol/graph-ts/index";
import {PriceChanged, EditionGifted} from "../../../generated/ArtistEditionControlsV2/ArtistEditionControlsV2";
import {KnownOriginV2} from "../../../generated/KnownOriginV2/KnownOriginV2";

import * as activityEventService from "../../services/ActivityEvent.service";
import * as tokenService from "../../services/Token.service";
import * as editionService from "../../services/Edition.service";

import {Edition} from "../../../generated/schema";
import * as SaleTypes from "../../utils/SaleTypes";

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

    activityEventService.recordPriceChanged(event, editionEntity, event.params._priceInWei)
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

    let editionEntity = editionService.loadOrCreateV2Edition(editionNumber, event.block, contract)
    editionEntity.save()

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.save()

    activityEventService.recordEditionGifted(event, tokenEntity, editionEntity)
}

export function handleEditionPriceChange(contract: KnownOriginV2, editionNumber: BigInt, block: ethereum.Block, priceInWei: BigInt): Edition {
    let editionEntity = editionService.loadOrCreateV2Edition(editionNumber, block, contract)
    editionEntity.priceInWei = priceInWei
    editionEntity.metadataPrice = priceInWei
    editionEntity.offersOnly = priceInWei.equals(MAX_UINT_256)

    if (editionEntity.offersOnly) {
        editionEntity.salesType = SaleTypes.OFFERS_ONLY
        log.debug("handleEditionPriceChange() setting sales type [{}]", [SaleTypes.OFFERS_ONLY.toString()]);
    } else if (editionEntity.auctionEnabled) {
        editionEntity.salesType = SaleTypes.BUY_NOW_AND_OFFERS
        log.debug("handleEditionPriceChange() setting sales type [{}]", [SaleTypes.BUY_NOW_AND_OFFERS.toString()]);
    } else {
        editionEntity.salesType = SaleTypes.BUY_NOW
        log.debug("handleEditionPriceChange() setting sales type [{}]", [SaleTypes.BUY_NOW.toString()]);
    }

    editionEntity.save()
    return editionEntity
}
