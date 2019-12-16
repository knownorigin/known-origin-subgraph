import {Month} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {BigDecimal, BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {monthNumberFromEvent, toEther} from "../utils";

export function loadOrCreateMonth(monthAsNumber: string): Month | null {
    let monthEntity: Month | null = Month.load(monthAsNumber)
    if (monthEntity == null) {
        monthEntity = new Month(monthAsNumber)
        monthEntity.date = monthAsNumber
        monthEntity.transferCount = ZERO
        monthEntity.salesCount = ZERO
        monthEntity.giftsCount = ZERO
        monthEntity.totalValue = ZERO
        monthEntity.totalValueInEth = new BigDecimal(ZERO)
        monthEntity.highestValue = ZERO
        monthEntity.highestValueInEth = new BigDecimal(ZERO)
    }

    return monthEntity;
}

export function recordMonthTransfer(event: EthereumEvent): Month | null {
    let monthAsNumberString = monthNumberFromEvent(event)
    let monthEntity = loadOrCreateMonth(monthAsNumberString)
    monthEntity.transferCount = monthEntity.transferCount + ONE
    monthEntity.save()
    return monthEntity
}

export function recordMonthPurchase(event: EthereumEvent, tokenId: BigInt): Month | null {
    let monthAsNumberString = monthNumberFromEvent(event)
    let monthEntity = loadOrCreateMonth(monthAsNumberString)

    monthEntity.totalValue = monthEntity.totalValue + event.transaction.value
    monthEntity.totalValueInEth = monthEntity.totalValueInEth + toEther(event.transaction.value)

    if (event.transaction.value > monthEntity.highestValue) {
        monthEntity.highestValueToken = tokenId.toString()
        monthEntity.highestValue = event.transaction.value
        monthEntity.highestValueInEth = toEther(event.transaction.value)
    }

    monthEntity.save()

    return monthEntity
}
