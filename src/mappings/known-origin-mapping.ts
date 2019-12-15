import {
    BigInt,
    Address,
} from "@graphprotocol/graph-ts"

import {
    KnownOrigin,
    Purchase,
    Minted,
    EditionCreated,
    Pause,
    Unpause,
    OwnershipRenounced,
    OwnershipTransferred,
    RoleAdded,
    RoleRemoved,
    Transfer,
    Approval,
    ApprovalForAll
} from "../../generated/KnownOrigin/KnownOrigin"

import {loadOrCreateEdition} from "../services/Edition.service";
import {loadOrCreateDay, addEditionToDay} from "../services/Day.service";
import {
    addEditionToArtist,
    addSaleTotalsToArtist
} from "../services/Artist.service";
import {loadOrCreateToken} from "../services/Token.service";
import {loadOrCreateMonth} from "../services/Month.service";

import {ONE, ZERO} from "../constants";
import {toEther, dayNumberFromEvent, monthNumberFromEvent} from "../utils";

export function handleEditionCreated(event: EditionCreated): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.save()

    // Update the day's stats
    let dayAsNumberString = dayNumberFromEvent(event)
    addEditionToDay(dayAsNumberString, editionEntity.id.toString())

    // Update artist
    let _editionData = contract.detailsOfEdition(event.params._editionNumber)
    addEditionToArtist(_editionData.value4, event.params._editionNumber.toString(), _editionData.value9, event.block.timestamp)
}

export function handleTransfer(event: Transfer): void {
    let contract = KnownOrigin.bind(event.address)

    // TOKEN
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

    tokenEntity.ownerCount = tokenEntity.ownerCount + ONE

    if (event.transaction.value > tokenEntity.highestValue) {
        tokenEntity.highestValue = event.transaction.value

        tokenEntity.highestValueInEth = toEther(event.transaction.value)
    }

    tokenEntity.from = event.params._from
    tokenEntity.to = event.params._to

    tokenEntity.save()

    // DAY
    let dayAsNumberString = dayNumberFromEvent(event)
    let dayEntity = loadOrCreateDay(dayAsNumberString)

    dayEntity.transferCount = dayEntity.transferCount + ONE
    dayEntity.totalValue = dayEntity.totalValue + event.transaction.value
    dayEntity.totalValueInEth = dayEntity.totalValueInEth + toEther(event.transaction.value)
    dayEntity.totalGasUsed = dayEntity.totalGasUsed + event.transaction.gasUsed

    dayEntity.highestGasPrice = (event.transaction.gasPrice > dayEntity.highestGasPrice) ? event.transaction.gasPrice : dayEntity.highestGasPrice

    if (event.transaction.value > dayEntity.highestValue) {
        dayEntity.highestValueToken = event.params._tokenId.toString()
        dayEntity.highestValue = event.transaction.value

        dayEntity.highestValueInEth = toEther(event.transaction.value)
    }

    // PRIMARY SALE
    if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
        let sales = dayEntity.sales
        sales.push(tokenEntity.id.toString())
        dayEntity.sales = sales

        // ARTIST
        let editionNumber = tokenEntity.editionNumber
        let artistAddress = contract.artistCommission(editionNumber).value0
        addSaleTotalsToArtist(artistAddress, event.params._tokenId, event.transaction)
    }

    dayEntity.save()

    // MONTH
    let monthAsNumberString = monthNumberFromEvent(event)
    let monthEntity = loadOrCreateMonth(monthAsNumberString)

    monthEntity.transferCount = monthEntity.transferCount + ONE
    monthEntity.totalValue = monthEntity.totalValue + event.transaction.value
    monthEntity.totalValueInEth = monthEntity.totalValueInEth + toEther(event.transaction.value)

    if (event.transaction.value > monthEntity.highestValue) {
        monthEntity.highestValueToken = event.params._tokenId.toString()
        monthEntity.highestValue = event.transaction.value
        monthEntity.highestValueInEth = toEther(event.transaction.value)
    }

    monthEntity.save()
}

// Direct primary "Buy it now" purchase form the website
export function handlePurchase(event: Purchase): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)

}

// A token has been issued - could be purcvhase, gift, accepted offer
export function handleMinted(event: Minted): void {

    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract)
    
}
