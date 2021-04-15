import {
    Transfer,
    KnownOriginV1,
    PurchasedWithEther,
} from "../../generated/KnownOriginV1/KnownOriginV1"

import {
    loadDayFromEvent,
    recordDayCounts,
    recordDayIssued,
    recordDayTransfer,
    recordDayValue
} from "../services/Day.service";
import {
    loadOrCreateArtist,
    recordArtistCounts,
    recordArtistIssued,
    recordArtistValue
} from "../services/Artist.service";
import {ONE} from "../constants";
import {getArtistAddress} from "../services/AddressMapping.service";
import {addPrimarySaleToCollector} from "../services/Collector.service";
import {log} from "@graphprotocol/graph-ts/index";

// FIXME need to think about this a bit more...
export function handlePurchase(event: PurchasedWithEther): void {
    log.info("KO V1 handlePurchase() called for event address {}", [event.address.toHexString()]);

    let contract = KnownOriginV1.bind(event.address)

    // Record Artist Data
    let tokenId = event.params._tokenId
    // let artistAddress = getArtistAddress(contract.editionInfo(tokenId).value4)

    // recordArtistValue(artistAddress, tokenId, event.transaction.value)
    // recordDayValue(event, event.params._tokenId, event.transaction.value)

    // recordDayCounts(event, event.transaction.value)
    // recordArtistCounts(artistAddress, event.transaction.value)

    // recordDayIssued(event, tokenId)
    // recordArtistIssued(artistAddress)

    // let artist = loadOrCreateArtist(artistAddress)
    // artist.supply = artist.supply.plus(ONE)
    // artist.save()

    addPrimarySaleToCollector(event.block, event.params._buyer, event.transaction.value);
}

export function handleTransfer(event: Transfer): void {
    log.info("KO V1 handleTransfer() called for event address {}", [event.params._tokenId.toString()]);

    // let contract = KnownOrigin.bind(event.address)
    //
    // // TOKEN
    // let tokenEntity = loadOrCreateV2Token(event.params._tokenId, contract)
    //
    // // set birth on Token
    // if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
    //     tokenEntity.birthTimestamp = event.block.timestamp
    // }

    recordDayTransfer(event)
}
