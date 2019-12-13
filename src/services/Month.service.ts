import {Month} from "../../generated/schema";
import {ZERO} from "../constants";
import {BigDecimal} from "@graphprotocol/graph-ts/index";

export function loadOrCreateMonth(monthAsNumber: string): Month | null {
    let monthEntity: Month | null = Month.load(monthAsNumber)
    if (monthEntity == null) {
        monthEntity = new Month(monthAsNumber)
        monthEntity.date = monthAsNumber
        monthEntity.transferCount = ZERO
        monthEntity.totalValue = ZERO
        monthEntity.totalValueInEth = new BigDecimal(ZERO)
        monthEntity.highestValue = ZERO
        monthEntity.highestValueInEth = new BigDecimal(ZERO)
    }

    return monthEntity;
}