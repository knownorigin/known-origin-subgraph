import {
    KnownOrigin,
    Purchase,
    Minted,
    EditionCreated,
    Transfer,
    KnownOrigin__detailsOfEditionResult,
} from "../../generated/KnownOrigin/KnownOrigin"

import {loadOrCreateEdition} from "../services/Edition.service";
import {addEditionToDay, recordDayCounts, recordDayTransfer, recordDayValue} from "../services/Day.service";
import {addEditionToArtist, recordArtistValue, recordArtistCounts} from "../services/Artist.service";
import {loadOrCreateToken} from "../services/Token.service";
import {CallResult, log, Address} from "@graphprotocol/graph-ts/index";
import {toEther} from "../utils";
import {ONE} from "../constants";

export function handleEditionCreated(event: EditionCreated): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.save()

    addEditionToDay(event, editionEntity.id);

    // Update artist
    let _editionDataResult: CallResult<KnownOrigin__detailsOfEditionResult> = contract.try_detailsOfEdition(event.params._editionNumber)
    if (!_editionDataResult.reverted) {
        let _editionData = _editionDataResult.value;
        addEditionToArtist(_editionData.value4, event.params._editionNumber.toString(), _editionData.value9, event.block.timestamp)
    } else {
        log.error("Handled reverted detailsOfEdition() call for {}", [event.params._editionNumber.toString()]);
    }
}

export function handleTransfer(event: Transfer): void {
    let contract = KnownOrigin.bind(event.address)

    // TOKEN
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    // set birth on Token
    if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
        tokenEntity.birthTimestamp = event.block.timestamp
        tokenEntity.primaryValueInEth = toEther(event.transaction.value)
    }

    tokenEntity.save()

    recordDayTransfer(event)
}

// Direct primary "Buy it now" purchase form the website
export function handlePurchase(event: Purchase): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition + toEther(event.params._priceInWei);
    editionEntity.save()

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    // Record Artist Data
    let editionNumber = event.params._editionNumber
    let artistAddress = contract.artistCommission(editionNumber).value0

    recordArtistValue(artistAddress, event.params._tokenId, event.transaction.value)
    recordDayValue(event, event.params._tokenId, event.transaction.value)

    recordDayCounts(event, event.params._tokenId, event.transaction.value)
    recordArtistCounts(artistAddress, event.transaction.value)
}

// A token has been issued - could be purchase, gift, accepted offer
export function handleMinted(event: Minted): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    // Record supply being consumed (useful to know how many are left in a edition i.e. available = supply = remaining)
    editionEntity.totalSupply = editionEntity.totalSupply.plus(ONE)

    // Maintain a list of tokenId issued from the edition
    let tokenIds = editionEntity.tokenIds
    tokenIds.push(event.params._tokenId)
    editionEntity.tokenIds = tokenIds

    // Save edition entity
    editionEntity.save();

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    tokenEntity.save();

    // let editionNumber = event.params._editionNumber
    // let artistAddress = contract.artistCommission(editionNumber).value0
}
