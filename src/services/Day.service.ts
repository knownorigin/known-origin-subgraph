import {Day} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {BigDecimal, BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {civilFromEventTimestamp, toEther} from "../utils";

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
        dayEntity.totalValueInEth = new BigDecimal(ZERO)
        dayEntity.highestValueInEth = new BigDecimal(ZERO)
        dayEntity.sales = new Array<string>()
        dayEntity.gifts = new Array<string>()
        dayEntity.editions = new Array<string>()
    }

    return dayEntity;
}

export function loadDayFromEvent(event: EthereumEvent): Day | null {
    let civil = civilFromEventTimestamp(event)

    let month = civil.month.toString();
    let day = civil.day.toString();
    let paddedMonth = month.length === 1 ? "0".concat(month) : month;
    let paddedDay = day.length === 1 ? "0".concat(day) : day;

    let dayId = civil.year.toString().concat("-").concat(paddedMonth).concat("-").concat(paddedDay);

    return loadOrCreateDay(dayId)
}

export function addEditionToDay(editionCreated: EthereumEvent, editionEntityId: string): Day | null {
    let dayEntity = loadDayFromEvent(editionCreated)

    dayEntity.editionsCount = dayEntity.editionsCount + ONE

    let editions = dayEntity.editions
    editions.push(editionEntityId)
    dayEntity.editions = editions

    dayEntity.save()

    return dayEntity
}

export function recordDayTransfer(event: EthereumEvent): Day | null {
    let dayEntity = loadDayFromEvent(event)

    dayEntity.transferCount = dayEntity.transferCount + ONE

    dayEntity.save()

    return dayEntity
}

export function recordDayBidAcceptedCount(event: EthereumEvent, tokenId: BigInt): Day | null {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsAcceptedCount = dayEntity.bidsAcceptedCount + ONE

    dayEntity.save()

    return dayEntity
}

export function recordDayBidPlacedCount(event: EthereumEvent): Day | null {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsPlacedCount = dayEntity.bidsPlacedCount + ONE

    dayEntity.save()

    return dayEntity
}

export function recordDayBidRejectedCount(event: EthereumEvent): Day | null {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsRejectedCount = dayEntity.bidsRejectedCount + ONE

    dayEntity.save()

    return dayEntity
}

export function recordDayValue(event: EthereumEvent, tokenId: BigInt): Day | null {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValueInEth = dayEntity.totalValueInEth + toEther(event.transaction.value)

    if (toEther(event.transaction.value) > dayEntity.highestValueInEth) {
        dayEntity.highestValueToken = tokenId.toString()
        dayEntity.highestValueInEth = toEther(event.transaction.value)
    }

    dayEntity.save()

    return dayEntity
}

export function recordDayCounts(event: EthereumEvent, tokenId: BigInt): Day | null {
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

    return dayEntity
}
