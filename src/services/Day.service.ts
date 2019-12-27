import {Day} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {BigDecimal, BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {toEther} from "../utils";
import {dayMonthYearFromEventTimestamp} from "../DateConverter";

export function loadOrCreateDay(date: string): Day | null {
    let dayEntity: Day | null = Day.load(date)

    if (dayEntity === null) {
        dayEntity = new Day(date)
        dayEntity.date = date
        dayEntity.transferCount = ZERO
        dayEntity.salesCount = ZERO
        dayEntity.giftsCount = ZERO
        dayEntity.editionsCount = ZERO
        dayEntity.bidsAcceptedCount = ZERO
        dayEntity.bidsPlacedCount = ZERO
        dayEntity.bidsRejectedCount = ZERO
        dayEntity.bidsWithdrawnCount = ZERO
        dayEntity.bidsIncreasedCount = ZERO
        dayEntity.totalValueCycledInBids = new BigDecimal(ZERO)
        dayEntity.totalValueInEth = new BigDecimal(ZERO)
        dayEntity.highestValueInEth = new BigDecimal(ZERO)
        dayEntity.sales = new Array<string>()
        dayEntity.gifts = new Array<string>()
        dayEntity.editions = new Array<string>()
    }

    return dayEntity;
}

export function loadDayFromEvent(event: EthereumEvent): Day | null {
    let dayMonthYear = dayMonthYearFromEventTimestamp(event)

    let month = dayMonthYear.month.toString();
    let day = dayMonthYear.day.toString();
    let paddedMonth = month.length === 1 ? "0".concat(month) : month;
    let paddedDay = day.length === 1 ? "0".concat(day) : day;

    let dayId = dayMonthYear.year.toString().concat("-").concat(paddedMonth).concat("-").concat(paddedDay);

    return loadOrCreateDay(dayId)
}

export function addEditionToDay(editionCreated: EthereumEvent, editionEntityId: string): void {
    let dayEntity = loadDayFromEvent(editionCreated)

    dayEntity.editionsCount = dayEntity.editionsCount + ONE

    let editions = dayEntity.editions
    editions.push(editionEntityId)
    dayEntity.editions = editions

    dayEntity.save()
}

export function recordDayTransfer(event: EthereumEvent): void {
    let dayEntity = loadDayFromEvent(event)

    dayEntity.transferCount = dayEntity.transferCount + ONE

    dayEntity.save()
}

export function recordDayBidAcceptedCount(event: EthereumEvent): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsAcceptedCount = dayEntity.bidsAcceptedCount + ONE

    dayEntity.save()
}

export function recordDayBidPlacedCount(event: EthereumEvent): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsPlacedCount = dayEntity.bidsPlacedCount + ONE

    dayEntity.save()
}

export function recordDayTotalValueCycledInBids(event: EthereumEvent, value:BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValueCycledInBids = dayEntity.totalValueCycledInBids + toEther(value)

    dayEntity.save()
}

export function recordDayTotalValuePlaceInBids(event: EthereumEvent, value:BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValuePlaceInBids = dayEntity.totalValuePlaceInBids + toEther(value)

    dayEntity.save()
}

export function recordDayBidRejectedCount(event: EthereumEvent): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsRejectedCount = dayEntity.bidsRejectedCount + ONE

    dayEntity.save()
}

export function recordDayBidWithdrawnCount(event: EthereumEvent): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsWithdrawnCount = dayEntity.bidsWithdrawnCount + ONE

    dayEntity.save()
}

export function recordDayBidIncreasedCount(event: EthereumEvent): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsIncreasedCount = dayEntity.bidsIncreasedCount + ONE

    dayEntity.save()
}


export function recordDayValue(event: EthereumEvent, tokenId: BigInt, value: BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValueInEth = dayEntity.totalValueInEth + toEther(value)

    if (toEther(value) > dayEntity.highestValueInEth) {
        dayEntity.highestValueToken = tokenId.toString()
        dayEntity.highestValueInEth = toEther(value)
    }

    dayEntity.save()
}

export function recordDayCounts(event: EthereumEvent, tokenId: BigInt): void {
    let dayEntity = loadDayFromEvent(event)

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
}
