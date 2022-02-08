import {
    GatedSale,
} from "../../generated/schema";
import {BigInt, log} from "@graphprotocol/graph-ts/index";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";

export function loadOrCreateGatedSale(saleId: BigInt, editionId: BigInt): GatedSale {
    log.info("loadOrCreateGatedSale() called  for sale ID {}", [saleId.toString()])

    let gatedSale = GatedSale.load(saleId.toString());

    if (gatedSale == null) {
        gatedSale = new GatedSale(saleId.toString());
        gatedSale.editionId = editionId;
        gatedSale.save();
    }

    return gatedSale as GatedSale;
}
