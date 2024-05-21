import { Day } from "../../generated/schema";
import { ONE, ZERO } from "../utils/constants";
import {BigDecimal, BigInt, Bytes, ethereum} from "@graphprotocol/graph-ts/index";
import { toEther } from "../utils/utils";
import { dayMonthYearFromEventTimestamp } from "../utils/DateConverter";

export function loadOrCreateDay(date: string): Day {
    let dayEntity = Day.load(Bytes.fromUTF8(date))

    if (dayEntity === null) {
        dayEntity = new Day(Bytes.fromUTF8(date))
        dayEntity.date = date
        dayEntity.transferCount = ZERO
        dayEntity.issuedCount = ZERO
        dayEntity.salesCount = ZERO
        dayEntity.editionsCount = ZERO
        dayEntity.bidsAcceptedCount = ZERO
        dayEntity.bidsPlacedCount = ZERO
        dayEntity.bidsRejectedCount = ZERO
        dayEntity.bidsWithdrawnCount = ZERO
        dayEntity.bidsIncreasedCount = ZERO
        dayEntity.totalValuePlaceInBids = new BigDecimal(ZERO)
        dayEntity.totalValueCycledInBids = new BigDecimal(ZERO)
        dayEntity.totalValueInEth = new BigDecimal(ZERO)
        dayEntity.highestValueInEth = new BigDecimal(ZERO)
        dayEntity.secondarySalesValue = new BigDecimal(ZERO)
        dayEntity.issued = new Array<Bytes>()
        dayEntity.editions = new Array<Bytes>()
    }

    return dayEntity as Day;
}

export function createDayId(event: ethereum.Event):string {
    let dayMonthYear = dayMonthYearFromEventTimestamp(event);
    let month = dayMonthYear.month.toString();
    let day = dayMonthYear.day.toString();
    let paddedMonth = month.length === 1 ? "0".concat(month) : month;
    let paddedDay = day.length === 1 ? "0".concat(day) : day;
    return dayMonthYear.year.toString().concat("-").concat(paddedMonth).concat("-").concat(paddedDay);
}

export function loadDayFromEvent(event: ethereum.Event): Day {
    let dayId = createDayId(event);
    return loadOrCreateDay(dayId)
}

export function addEditionToDay(editionCreated: ethereum.Event, editionEntityId: Bytes): void {
    let dayEntity = loadDayFromEvent(editionCreated)

    dayEntity.editionsCount = dayEntity.editionsCount.plus(ONE)

    let editions = dayEntity.editions
    editions.push(editionEntityId)
    dayEntity.editions = editions

    dayEntity.save()
}

export function recordDayTransfer(event: ethereum.Event): void {
    let dayEntity = loadDayFromEvent(event)

    dayEntity.transferCount = dayEntity.transferCount.plus(ONE)

    dayEntity.save()
}

export function recordDayBidAcceptedCount(event: ethereum.Event): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsAcceptedCount = dayEntity.bidsAcceptedCount.plus(ONE)

    dayEntity.save()
}

export function recordDayBidPlacedCount(event: ethereum.Event): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsPlacedCount = dayEntity.bidsPlacedCount.plus(ONE)

    dayEntity.save()
}

export function recordDayTotalValueCycledInBids(event: ethereum.Event, value: BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValueCycledInBids = dayEntity.totalValueCycledInBids.plus(toEther(value))

    dayEntity.save()
}

export function recordDaySecondaryTotalValue(event: ethereum.Event, value: BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.secondarySalesValue = dayEntity.secondarySalesValue.plus(toEther(value))

    dayEntity.save()
}

export function recordDayTotalValuePlaceInBids(event: ethereum.Event, value: BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValuePlaceInBids = dayEntity.totalValuePlaceInBids.plus(toEther(value))

    dayEntity.save()
}

export function recordDayBidRejectedCount(event: ethereum.Event): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsRejectedCount = dayEntity.bidsRejectedCount.plus(ONE)

    dayEntity.save()
}

export function recordDayBidWithdrawnCount(event: ethereum.Event): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsWithdrawnCount = dayEntity.bidsWithdrawnCount.plus(ONE)

    dayEntity.save()
}

export function recordDayBidIncreasedCount(event: ethereum.Event): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.bidsIncreasedCount = dayEntity.bidsIncreasedCount.plus(ONE)

    dayEntity.save()
}


export function recordDayValue(event: ethereum.Event, tokenId: BigInt, value: BigInt): void {
    let dayEntity = loadDayFromEvent(event)
    dayEntity.totalValueInEth = dayEntity.totalValueInEth.plus(toEther(value))

    if (toEther(value) > dayEntity.highestValueInEth) {
        dayEntity.highestValueToken = Bytes.fromBigInt(tokenId) as Bytes
        dayEntity.highestValueInEth = toEther(value)
    }

    dayEntity.save()
}

export function recordDayCounts(event: ethereum.Event, value: BigInt): void {
    let dayEntity = loadDayFromEvent(event)

    // only if has value can it be a sale - via purchase and bid accepted
    if (value > ZERO) {
        dayEntity.salesCount = dayEntity.salesCount.plus(ONE)
    }

    dayEntity.save()
}

export function recordDayIssued(event: ethereum.Event, tokenId: BigInt): void {
    let dayEntity = loadDayFromEvent(event)

    // add all purchase with eth, gifts, bid accepted
    let issued = dayEntity.issued
    issued.push(Bytes.fromBigInt(tokenId) as Bytes)
    dayEntity.issued = issued

    dayEntity.save()

    dayEntity.issuedCount = dayEntity.issuedCount.plus(ONE)

    dayEntity.save()
}
