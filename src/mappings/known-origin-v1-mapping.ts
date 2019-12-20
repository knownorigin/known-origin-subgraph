import {
    Transfer,
    KnownOriginV1,
    PurchasedWithEther,
} from "../../generated/KnownOriginV1/KnownOriginV1"

import {loadDayFromEvent, recordDayTransfer, recordDayValue} from "../services/Day.service";
import {recordArtistValue} from "../services/Artist.service";
import {ONE} from "../constants";

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
}

export function handleTransfer(event: Transfer): void {
    recordDayTransfer(event)
}
