import {log} from "@graphprotocol/graph-ts/index";
import {
    AdminUpdateSecondaryRoyalty,
    AdminUpdateSecondarySaleCommission,
    AdminUpdateModulo,
    AdminUpdateMinBidAmount,
} from "../../generated/KODAV3SecondaryMarketplace/KODAV3SecondaryMarketplace";

import {getPlatformConfig} from "../services/PlatformConfig.factory";

export function handleAdminUpdateSecondaryRoyalty(event: AdminUpdateSecondaryRoyalty): void {
    log.info("KO V3 handleAdminUpdateSecondaryRoyalty() called - secondarySaleRoyalty {}", [event.params._secondarySaleRoyalty.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.secondarySaleRoyalty = event.params._secondarySaleRoyalty;
    marketConfig.save();
}

export function handleAdminUpdateSecondarySaleCommission(event: AdminUpdateSecondarySaleCommission): void {
    log.info("KO V3 handleAdminUpdatePlatformPrimarySaleCommission() called - platformSecondarySaleCommission {}", [event.params._platformSecondarySaleCommission.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.marketplaceSecondarySaleRoyalty = event.params._platformSecondarySaleCommission;
    marketConfig.save();
}

export function handleAdminUpdateModulo(event: AdminUpdateModulo): void {
    log.info("KO V3 handleAdminUpdateModulo() called - modulo {}", [event.params._modulo.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.modulo = event.params._modulo;
    marketConfig.save();
}

export function handleAdminUpdateMinBidAmount(event: AdminUpdateMinBidAmount): void {
    log.info("KO V3 handleAdminUpdateModulo() called - minBidAmount {}", [event.params._minBidAmount.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.modulo = event.params._minBidAmount;
    marketConfig.save();
}
