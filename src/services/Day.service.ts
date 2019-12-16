import {Day, Month} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {BigDecimal, BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {dayNumberFromEvent, monthNumberFromEvent, toEther} from "../utils";
import {loadOrCreateMonth} from "./Month.service";

export function loadOrCreateDay(dayNumber: string): Day | null {
    let dayEntity: Day | null = Day.load(dayNumber)

    if (dayEntity === null) {
        dayEntity = new Day(dayNumber)
        dayEntity.date = dayNumber
        dayEntity.transferCount = ZERO
        dayEntity.salesCount = ZERO
        dayEntity.giftsCount = ZERO
        dayEntity.editionsCount = ZERO
        dayEntity.totalValueInEth = new BigDecimal(ZERO)
        dayEntity.totalGasUsed = ZERO
        dayEntity.highestValueInEth = new BigDecimal(ZERO)
        dayEntity.highestGasPrice = ZERO
        dayEntity.sales = new Array<string>()
        dayEntity.gifts = new Array<string>()
        dayEntity.editions = new Array<string>()
    }

    return dayEntity;
}

export function addEditionToDay(dayAsNumber: string, editionEntityId: string): Day | null {
    let dayEntity = loadOrCreateDay(dayAsNumber)

    dayEntity.editionsCount = dayEntity.editionsCount + ONE

    let editions = dayEntity.editions
    editions.push(editionEntityId)
    dayEntity.editions = editions

    dayEntity.save()

    return dayEntity
}

export function recordDayTransfer(event: EthereumEvent): Day | null {
    let dayAsNumberString = dayNumberFromEvent(event)
    let dayEntity = loadOrCreateDay(dayAsNumberString)

    dayEntity.transferCount = dayEntity.transferCount + ONE

    dayEntity.save()

    return dayEntity
}

export function recordDayValue(event: EthereumEvent, tokenId: BigInt): Day | null {
    let dayAsNumberString = dayNumberFromEvent(event)

    let dayEntity = loadOrCreateDay(dayAsNumberString)
    dayEntity.totalValueInEth = dayEntity.totalValueInEth + toEther(event.transaction.value)

    if (toEther(event.transaction.value) > dayEntity.highestValueInEth) {
        dayEntity.highestValueToken = tokenId.toString()
        dayEntity.highestValueInEth = toEther(event.transaction.value)
    }

    dayEntity.save()

    return dayEntity
}

export function recordDayCounts(event: EthereumEvent, tokenId: BigInt): Day | null {
    let dayAsNumberString = dayNumberFromEvent(event)

    let dayEntity = loadOrCreateDay(dayAsNumberString)

    if (event.transaction.value > ZERO) {
        // Record token as a sale
        let sales = dayEntity.sales
        sales.push(tokenId.toString())
        dayEntity.sales = sales

        dayEntity.salesCount = dayEntity.salesCount + ONE
    } else {
        // Record token as a gift
        let gifts = dayEntity.gifts
        gifts.push(tokenId.toString())
        dayEntity.gifts = gifts

        dayEntity.giftsCount = dayEntity.giftsCount + ONE
    }

    dayEntity.save()

    return dayEntity
}
