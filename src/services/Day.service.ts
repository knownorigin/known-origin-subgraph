import {Day} from "../../generated/schema";
import {ZERO} from "../constants";
import {BigDecimal} from "@graphprotocol/graph-ts/index";
import {dayNumberFromEvent} from "../utils";

export function loadOrCreateDay(dayNumber: string): Day | null {
    let dayEntity: Day | null = Day.load(dayNumber)

    if (dayEntity === null) {
        dayEntity = new Day(dayNumber)
        dayEntity.date = dayNumber
        dayEntity.transferCount = ZERO
        dayEntity.totalValue = ZERO
        dayEntity.totalValueInEth = new BigDecimal(ZERO)
        dayEntity.totalGasUsed = ZERO
        dayEntity.highestValue = ZERO
        dayEntity.highestValueInEth = new BigDecimal(ZERO)
        dayEntity.highestGasPrice = ZERO
        dayEntity.sales = new Array<string>()
        dayEntity.editions = new Array<string>()
    }

    return dayEntity;
}

export function addEditionToDay(dayAsNumber: string, editionEntityId: string): void {
    let dayEntity = loadOrCreateDay(dayAsNumber)

    let editions = dayEntity.editions
    editions.push(editionEntityId)
    dayEntity.editions = editions

    dayEntity.save()
}