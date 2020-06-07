import {getKnownOriginForAddress} from "../services/KnownOrigin.factory";
import {loadOrCreateEdition} from "../services/Edition.service";
import {MAX_UINT_256} from "../constants";
import {BigInt, log, ethereum} from "@graphprotocol/graph-ts/index";
import {PriceChanged} from "../../generated/ArtistEditionControlsV2/ArtistEditionControlsV2";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";

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

export function handleEditionPriceChange(contract: KnownOrigin, editionNumber: BigInt, block: ethereum.Block, priceInWei: BigInt): void {
    let editionEntity = loadOrCreateEdition(editionNumber, block, contract)
    editionEntity.priceInWei = priceInWei
    editionEntity.offersOnly = priceInWei.equals(MAX_UINT_256)
    editionEntity.save()
}
