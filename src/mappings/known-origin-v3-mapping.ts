import {Address, log, store} from "@graphprotocol/graph-ts/index";
import {Transfer, KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";
import {MAX_UINT_256, ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {loadOrCreateV3EditionFromTokenId} from "../services/Edition.service";


export function handleTransfer(event: Transfer): void {
    log.info("handleTransfer() called for event address {}", [event.address.toHexString()]);

    if (event.params.from === ZERO_ADDRESS) {
        // FIXME
        // create edition
        const kodaV3Contract = KnownOriginV3.bind(event.address);
        loadOrCreateV3EditionFromTokenId(event.params.tokenId, event.block, kodaV3Contract);

    } else {
        // FIXME
        // handle sale/movement
    }

}


