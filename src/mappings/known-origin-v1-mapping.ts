import {
    Transfer,
    KnownOriginV1,
    PurchasedWithEther,
} from "../../generated/KnownOriginV1/KnownOriginV1"

import {loadDayFromEvent, recordDayTransfer, recordDayValue} from "../services/Day.service";
import {recordArtistValue} from "../services/Artist.service";
import {ONE} from "../constants";
import {Address} from "@graphprotocol/graph-ts/index";
import {loadOrCreateToken} from "../services/Token.service";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";

export function handlePurchase(event: PurchasedWithEther): void {
    let contract = KnownOriginV1.bind(event.address)

    // Record Artist Data
    let tokenId = event.params._tokenId
    let artistAddress = contract.editionInfo(tokenId).value4
    recordArtistValue(artistAddress, tokenId, event.transaction)

    // Record Purchases against the Day & Month
    recordDayValue(event, event.params._tokenId, event.transaction.value)

    // Record token as a sale
    let dayEntity = loadDayFromEvent(event)
    let sales = dayEntity.sales
    sales.push(tokenId.toString())
    dayEntity.sales = sales

    dayEntity.salesCount = dayEntity.salesCount + ONE

    dayEntity.save()
}

export function handleTransfer(event: Transfer): void {
    // let contract = KnownOrigin.bind(event.address)
    //
    // // TOKEN
    // let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    //
    // // set birth on Token
    // if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
    //     tokenEntity.birthTimestamp = event.block.timestamp
    // }

    recordDayTransfer(event)
}
