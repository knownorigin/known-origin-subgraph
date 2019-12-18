import {
    KnownOrigin,
    Purchase,
    Minted,
    EditionCreated,
    Transfer,
} from "../../generated/KnownOrigin/KnownOrigin"

import {loadOrCreateEdition} from "../services/Edition.service";
import {addEditionToDay, recordDayCounts, recordDayTransfer, recordDayValue} from "../services/Day.service";
import {addEditionToArtist, recordArtistValue, recordArtistCounts} from "../services/Artist.service";
import {loadOrCreateToken} from "../services/Token.service";

export function handleEditionCreated(event: EditionCreated): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.save()

    addEditionToDay(event, editionEntity.id.toString());

    // Update artist
    let _editionData = contract.detailsOfEdition(event.params._editionNumber)
    addEditionToArtist(_editionData.value4, event.params._editionNumber.toString(), _editionData.value9, event.block.timestamp)
}

export function handleTransfer(event: Transfer): void {
    let contract = KnownOrigin.bind(event.address)

    // TOKEN
    // TODO how does this work with Purchase/BidAccepted?
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    tokenEntity.save()

    recordDayTransfer(event)
}

// Direct primary "Buy it now" purchase form the website
export function handlePurchase(event: Purchase): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    // Record Artist Data
    let editionNumber = event.params._editionNumber
    let artistAddress = contract.artistCommission(editionNumber).value0
    recordArtistValue(artistAddress, event.params._tokenId, event.transaction)

    // Record Purchases against the Day & Month
    recordDayValue(event, event.params._tokenId)
}

// A token has been issued - could be purchase, gift, accepted offer
export function handleMinted(event: Minted): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    recordDayCounts(event, event.params._tokenId)

    let editionNumber = event.params._editionNumber
    let artistAddress = contract.artistCommission(editionNumber).value0
    recordArtistCounts(artistAddress, event.params._tokenId, event.transaction)
}
