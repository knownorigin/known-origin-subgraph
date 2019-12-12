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
import {loadOrCreateArtist, addEditionToArtist} from "../services/Artist.service";
import {loadOrCreateToken} from "../services/Token.service";
import {loadOrCreateMonth} from "../services/Month.service";

import {ONE} from "../constants";
import {toEther, dayNumberFromEvent, monthNumberFromEvent} from "../utils";

export function handlePurchase(event: Purchase): void {
}

export function handleMinted(event: Minted): void {
}

export function handleEditionCreated(event: EditionCreated): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, contract)
    editionEntity.createdTimestamp = event.block.timestamp
    editionEntity.tokenIds = new Array<BigInt>()
    editionEntity.auctionEnabled = false
    editionEntity.save()

    // Update the day's stats
    let dayAsNumberString = dayNumberFromEvent(event)
    addEditionToDay(dayAsNumberString, editionEntity.id.toString())

    // Update artist
    let _editionData = contract.detailsOfEdition(event.params._editionNumber)
    addEditionToArtist(_editionData.value4, event.params._editionNumber.toString(), _editionData.value9, event.block.timestamp)
}

export function handlePause(event: Pause): void {
}

export function handleUnpause(event: Unpause): void {
}

export function handleOwnershipRenounced(event: OwnershipRenounced): void {
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
}

export function handleRoleAdded(event: RoleAdded): void {
}

export function handleRoleRemoved(event: RoleRemoved): void {
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
        let artist = loadOrCreateArtist(contract.artistCommission(editionNumber).value0)

        artist.salesCount = artist.salesCount + ONE

        artist.totalValue = artist.totalValue + event.transaction.value
        artist.totalValueInEth = artist.totalValueInEth + toEther(event.transaction.value)

        if (event.transaction.value > artist.highestSaleValue) {
            artist.highestSaleToken = event.params._tokenId.toString()
            artist.highestSaleValue = event.transaction.value
            artist.highestSaleValueInEth = toEther(event.transaction.value)
        }

        artist.save()
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

export function handleApproval(event: Approval): void {
}

export function handleApprovalForAll(event: ApprovalForAll): void {
}
