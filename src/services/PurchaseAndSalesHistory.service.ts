import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {PurchaseAndSalesHistory, Token} from "../../generated/schema";
import {toEther} from "../utils";

export function recordSaleEvent(transaction: ethereum.Transaction, token: Token | null, seller: Address, timestamp: BigInt, value: BigInt): void {

    // FIXME - work out value for seller - minus commission, possible optional splits so can be used in TAX report easily ...

    const id = "sale-"
        .concat(transaction.hash.toHexString())
        .concat("-")
        .concat(transaction.index.toString());

    let entry: PurchaseAndSalesHistory | null = PurchaseAndSalesHistory.load(id)

    if (entry == null) {
        entry = new PurchaseAndSalesHistory(id.toString());
        entry.eventType = "SALE"
        entry.address = seller
        entry.timestamp = timestamp
        entry.valueInEth = toEther(value)
        entry.transactionHash = transaction.hash
        entry.token = token.id
        entry.save()
    }

}

export function recordPurchaseEvent(transaction: ethereum.Transaction, token: Token | null, buyer: Address, timestamp: BigInt, value: BigInt): void {

    const id = "purchase-"
        .concat(transaction.hash.toHexString())
        .concat("-")
        .concat(transaction.index.toString());

    let entry: PurchaseAndSalesHistory | null = PurchaseAndSalesHistory.load(id)

    if (entry == null) {
        entry = new PurchaseAndSalesHistory(id.toString());
        entry.eventType = "PURCHASE"
        entry.address = buyer
        entry.timestamp = timestamp
        entry.valueInEth = toEther(value)
        entry.transactionHash = transaction.hash
        entry.token = token.id
        entry.save()
    }

}
