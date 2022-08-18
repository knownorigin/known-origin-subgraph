import {
    ListedEditionForBuyNow,
    Transfer
} from "../../../generated/KnownOriginV4Factory/BatchCreatorContract";

import {ZERO_ADDRESS} from "../../utils/constants";

import {
    loadOrCreateV4EditionFromTokenId
} from "../../services/Edition.service";

export function handleTransfer(event: Transfer): void {
    if (event.params.from.equals(ZERO_ADDRESS)) { // Mint
        let edition = loadOrCreateV4EditionFromTokenId(
            event.params.tokenId,
            event.block,
            event.address
        )
        edition.save()
    }
}

export function handleListedEditionForBuyNow(event: ListedEditionForBuyNow): void {

}