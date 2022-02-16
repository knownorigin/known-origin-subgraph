import {Address, log} from "@graphprotocol/graph-ts/index";

import {
    AdminUpdatePlatformPrimarySaleCommissionGatedSale,
    MintFromSale,
    PhaseCreated,
    PhaseRemoved,
    SalePaused,
    SaleResumed,
    SaleWithPhaseCreated,
    KODAV3UpgradableGatedMarketplace
} from "../../../generated/KODAV3UpgradableGatedMarketplace/KODAV3UpgradableGatedMarketplace";
import {KnownOriginV3} from "../../../generated/KnownOriginV3/KnownOriginV3";

import * as editionService from "../../services/Edition.service";
import * as gatedSaleService from "../../services/GatedSale.service";
import * as SaleTypes from "../../utils/SaleTypes";
import {
    _handleArtistAndDayCounts,
    _handleEditionPrimarySale,
    _handleTokenPrimarySale
} from "./known-origin-v3-primary-marketplace-mapping";
import * as collectorService from "../../services/Collector.service";
import * as tokenService from "../../services/Token.service";
import * as tokenEventFactory from "../../services/TokenEvent.factory";
import * as activityEventService from "../../services/ActivityEvent.service";
import * as EVENT_TYPES from "../../utils/EventTypes";


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

    // TODO Create activity event?

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
    log.info("KO V3 Gated Marketplace handleMintFromSale() called - sale {} phase {} token {}", [
        event.params.saleId.toString(),
        event.params.phaseId.toString(),
        event.params.tokenId.toString(),
    ]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3UpgradableGatedMarketplace.bind(event.address).koda()
    );

    let editionId = kodaV3Contract.getEditionIdOfToken(event.params.tokenId)

    log.info("KO V3 handleEditionPurchased() called - edition Id {}", [editionId.toString()]);

    let saleValue = event.transaction.value.div(event.params.mintCount);

    // Action edition data changes
    let editionEntity = editionService.loadNonNullableEdition(editionId)

    // Create collector
    let collector = collectorService.loadOrCreateCollector(event.params.account, event.block);
    collector.save();

    _handleEditionPrimarySale(editionEntity, collector, event.params.tokenId, saleValue)
    editionEntity.save()

    let tokenTransferEvent = tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params.tokenId, event.params.account, saleValue);
    tokenTransferEvent.save();

    // Set price against token
    let tokenEntity = tokenService.loadNonNullableToken(event.params.tokenId)
    _handleTokenPrimarySale(tokenEntity, saleValue)
    tokenEntity.save()

    // Record Artist Data
    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, editionEntity, event.params.tokenId, saleValue, artistAddress, event.params.account);

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, saleValue, event.params.account)
}

export function handleSalePaused(event: SalePaused): void {
    log.info("KO V3 Gated Marketplace handleSalePaused() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);

    // TODO Create activity event?

    const gatedSale = gatedSaleService.loadOrCreateGatedSale(event.params.saleId, event.params.editionId);
    gatedSale.paused = true;
    gatedSale.save();
}

export function handleSaleResumed(event: SaleResumed): void {
    log.info("KO V3 Gated Marketplace handleSaleResumed() called - sale {} edition {}", [
        event.params.saleId.toString(),
        event.params.editionId.toString(),
    ]);

    // TODO Create activity event?

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

