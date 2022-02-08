import {ONE, ZERO, ZERO_ADDRESS} from "../../utils/constants";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";
import {Address, ethereum, log} from "@graphprotocol/graph-ts/index";
import {BigInt} from "@graphprotocol/graph-ts";

import {Edition} from "../../../generated/schema";

import {
    SaleWithPhaseCreated,
} from "../../../generated/KODAV3GatedMarketplace/KODAV3GatedMarketplace";

import {toEther} from "../../utils/utils";

import * as gatedSaleService from "../../services/GatedSale.service";

export function handleSaleWithPhaseCreated(event: SaleWithPhaseCreated): void {
    log.info("KO V3 Gated Marketplace handleSaleWithPhaseCreated() called {}", [event.params.saleId.toString()]);

    let gatedSale = gatedSaleService.loadOrCreateGatedSale(event.params.saleId, event.params.editionId);
    gatedSale.save();
}

