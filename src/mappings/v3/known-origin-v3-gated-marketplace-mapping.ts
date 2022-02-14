import {log} from "@graphprotocol/graph-ts/index";

import {
    AdminUpdatePlatformPrimarySaleCommissionGatedSale,
    MintFromSale,
    PhaseCreated,
    PhaseRemoved,
    SalePaused,
    SaleResumed,
    SaleWithPhaseCreated,
} from "../../../generated/KODAV3GatedMarketplace/KODAV3GatedMarketplace";
import {KODAV3UpgradableGatedMarketplace} from "../../../generated/KODAV3UpgradableGatedMarketplace/KODAV3UpgradableGatedMarketplace";

import * as editionService from "../../services/Edition.service";
import * as gatedSaleService from "../../services/GatedSale.service";
import * as SaleTypes from "../../utils/SaleTypes";


export function handleSaleWithPhaseCreated(event: SaleWithPhaseCreated): void {
    log.info("KO V3 Gated Marketplace handleSaleWithPhaseCreated() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);

    const gatedSale = gatedSaleService.loadOrCreateGatedSale(event.params.saleId, event.params.editionId);
    gatedSale.save();

    // TODO Create activity event?

    const edition = editionService.loadNonNullableEdition(event.params.editionId)
    edition.salesType = SaleTypes.GATED_SALE_ONCHAIN;
    edition.gatedSale = gatedSale.id
    edition.save()
}

export function handlePhaseCreated(event: PhaseCreated): void {
    log.info("KO V3 Gated Marketplace handlePhaseCreated() called - sale {} edition {} phase {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
        event.params.phaseId.toString(),
    ]);

    const gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address)

    const phase = gatedSaleService.loadOrCreateGatedSalePhase(gatedMarketplace, event.params.saleId, event.params.editionId, event.params.phaseId);

    const gatedSale = gatedSaleService.loadOrCreateGatedSale(event.params.saleId, event.params.editionId);

    // add phase to sale
    const phases = gatedSale.phases
    phases.push(phase.id)
    gatedSale.phases = phases
    gatedSale.save();
}

export function handlePhaseRemoved(event: PhaseRemoved): void {
    log.info("KO V3 Gated Marketplace handlePhaseRemoved() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);

    // TODO remove phase from sale
}

export function handleMintFromSale(event: MintFromSale): void {
    log.info("KO V3 Gated Marketplace handleMintFromSale() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);

    // TODO re-enable once we know what token ha just sold

    // let kodaV3Contract = KnownOriginV3.bind(
    //     KODAV3UpgradableGatedMarketplace.bind(event.address).koda()
    // );
    //
    // let editionId = kodaV3Contract.getEditionIdOfToken(event.params._tokenId)
    //
    // log.info("KO V3 handleEditionPurchased() called - edition Id {}", [editionId.toString()]);
    //
    // // Action edition data changes
    // let editionEntity = editionService.loadNonNullableEdition(editionId)
    //
    // // Create collector
    // let collector = collectorService.loadOrCreateCollector(event.params._buyer, event.block);
    // collector.save();
    //
    // _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, event.params._price)
    // editionEntity.save()
    //
    // let tokenTransferEvent = tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params._tokenId, event.params._buyer, event.params._price);
    // tokenTransferEvent.save();
    //
    // // Set price against token
    // let tokenEntity = tokenService.loadNonNullableToken(event.params._tokenId)
    // _handleTokenPrimarySale(tokenEntity, event.params._price)
    // tokenEntity.save()
    //
    // // Record Artist Data
    // let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    // _handleArtistAndDayCounts(event, editionEntity, event.params._tokenId, event.params._price, artistAddress, event.params._buyer);
    //
    // activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._price, event.params._buyer)
}

export function handleSalePaused(event: SalePaused): void {
    log.info("KO V3 Gated Marketplace handleSalePaused() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);
    const gatedSale = gatedSaleService.loadOrCreateGatedSale(event.params.saleId, event.params.editionId);
    gatedSale.paused = true;
    gatedSale.save();
}

export function handleSaleResumed(event: SaleResumed): void {
    log.info("KO V3 Gated Marketplace handleSaleResumed() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);
    const gatedSale = gatedSaleService.loadOrCreateGatedSale(event.params.saleId, event.params.editionId);
    gatedSale.paused = false;
    gatedSale.save();
}

export function handleAdminUpdatePlatformPrimarySaleCommissionGatedSale(event: AdminUpdatePlatformPrimarySaleCommissionGatedSale): void {
    log.info("KO V3 Gated Marketplace primarySaleCommission set - sale {}", [event.params.saleId.toString()]);
    const gatedSale = gatedSaleService.loadNonNullableGatedSale(event.params.saleId);
    if (gatedSale) {
        gatedSale.primarySaleCommission = event.params.platformPrimarySaleCommission
        gatedSale.save();
    }
}

