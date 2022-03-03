import {Address, log, store} from "@graphprotocol/graph-ts/index";

import {
    AdminSetKoCommissionOverrideForSale,
    KODAV3UpgradableGatedMarketplace,
    MintFromSale,
    PhaseCreated,
    PhaseRemoved,
    SalePaused,
    SaleResumed,
    SaleWithPhaseCreated
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
import {Phase} from "../../../generated/schema";


export function handleSaleWithPhaseCreated(event: SaleWithPhaseCreated): void {
    log.info("KO V3 Gated Marketplace handleSaleWithPhaseCreated() called - sale {}", [
        event.params._saleId.toString()
    ]);

    let gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address)

    let editionId = gatedMarketplace.editionToSale(event.params._saleId);

    let gatedSale = gatedSaleService.loadOrCreateGatedSale(gatedMarketplace, event.params._saleId, editionId);
    gatedSale.save();

    let edition = editionService.loadNonNullableEdition(editionId)
    edition.gatedSale = gatedSale.id
    edition.save()

    activityEventService.recordGatedSaleCreated(event, gatedSale, edition)
}

export function handlePhaseCreated(event: PhaseCreated): void {
    log.info("KO V3 Gated Marketplace handlePhaseCreated() called - sale {} phase {}", [
        event.params._saleId.toString(),
        event.params._phaseId.toString(),
    ]);

    let gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address)

    let editionId = gatedMarketplace.editionToSale(event.params._saleId);

    let phase = gatedSaleService.loadOrCreateGatedSalePhase(gatedMarketplace, event.params._saleId, editionId, event.params._phaseId);

    let gatedSale = gatedSaleService.loadOrCreateGatedSale(gatedMarketplace, event.params._saleId, editionId);

    // add phase to sale
    let phases = gatedSale.phases
    phases.push(phase.id)
    gatedSale.phases = phases
    gatedSale.save();

    let edition = editionService.loadNonNullableEdition(editionId)

    activityEventService.recordGatedPhaseCreated(event, gatedSale, edition, phase)
}

export function handlePhaseRemoved(event: PhaseRemoved): void {
    log.info("KO V3 Gated Marketplace handlePhaseRemoved() called - sale {} edition {} phase {}", [
        event.params._saleId.toString(),
        event.params._phaseId.toString()
    ]);

    let gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address)

    let editionId = gatedMarketplace.editionToSale(event.params._saleId);

    gatedSaleService.removePhaseFromSale(event.params._saleId, editionId, event.params._phaseId)

    let phaseId = gatedSaleService.createPhaseId(event.params._saleId, editionId, event.params._phaseId)

    let phase = gatedSaleService.loadNonNullabledGatedPhase(phaseId);

    let gatedSale = gatedSaleService.loadOrCreateGatedSale(gatedMarketplace, event.params._saleId, editionId);
    let edition = editionService.loadNonNullableEdition(editionId)

    activityEventService.recordGatedPhaseRemoved(event, gatedSale, edition, phase)

    store.remove('Phase', event.params._phaseId.toString())
}

export function handleMintFromSale(event: MintFromSale): void {
    log.info("KO V3 Gated Marketplace handleMintFromSale() called - sale {} phase {} token {}", [
        event.params._saleId.toString(),
        event.params._phaseId.toString(),
        event.params._tokenId.toString(),
    ]);

    let kodaV3Contract = KnownOriginV3.bind(
        KODAV3UpgradableGatedMarketplace.bind(event.address).koda()
    );

    let editionId = kodaV3Contract.getEditionIdOfToken(event.params._tokenId)

    log.info("KO V3 handleEditionPurchased() called - edition Id {}", [editionId.toString()]);

    let saleValue = event.transaction.value;

    // Action edition data changes
    let editionEntity = editionService.loadNonNullableEdition(editionId)

    // Create collector
    let collector = collectorService.loadOrCreateCollector(event.params._recipient, event.block);
    collector.save();

    _handleEditionPrimarySale(editionEntity, collector, event.params._tokenId, saleValue)
    editionEntity.save()

    let tokenTransferEvent = tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params._tokenId, event.params._recipient, saleValue);
    tokenTransferEvent.save();

    // Set price against token
    let tokenEntity = tokenService.loadNonNullableToken(event.params._tokenId)
    _handleTokenPrimarySale(tokenEntity, saleValue)
    tokenEntity.save()

    // Record Artist Data
    let artistAddress = Address.fromString(editionEntity.artistAccount.toHexString());
    _handleArtistAndDayCounts(event, editionEntity, event.params._tokenId, saleValue, artistAddress, event.params._recipient);

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, saleValue, event.params._recipient)
}

export function handleSalePaused(event: SalePaused): void {
    log.info("KO V3 Gated Marketplace handleSalePaused() called - sale {}", [
        event.params._saleId.toString()
    ]);

    let gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address)
    let editionId = gatedMarketplace.editionToSale(event.params._saleId);

    let gatedSale = gatedSaleService.loadOrCreateGatedSale(gatedMarketplace, event.params._saleId, editionId);
    gatedSale.paused = true;
    gatedSale.save();

    let edition = editionService.loadNonNullableEdition(editionId)

    activityEventService.recordGatedSalePaused(event, gatedSale, edition)
}

export function handleSaleResumed(event: SaleResumed): void {
    log.info("KO V3 Gated Marketplace handleSaleResumed() called - sale {}", [
        event.params._saleId.toString()
    ]);
    let gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address)
    let editionId = gatedMarketplace.editionToSale(event.params._saleId);

    let edition = editionService.loadNonNullableEdition(editionId)

    let gatedSale = gatedSaleService.loadOrCreateGatedSale(gatedMarketplace, event.params._saleId, editionId);
    gatedSale.paused = false;
    gatedSale.save();

    activityEventService.recordGatedSaleResumed(event, gatedSale, edition)
}

export function handleAdminUpdatePlatformPrimarySaleCommissionGatedSale(event: AdminSetKoCommissionOverrideForSale): void {
    log.info("KO V3 Gated Marketplace primarySaleCommission set - sale {}", [event.params._saleId.toString()]);

    let gatedSale = gatedSaleService.loadNonNullableGatedSale(event.params._saleId);
    if (gatedSale !== null) {
        let gatedMarketplace = KODAV3UpgradableGatedMarketplace.bind(event.address);

        let commissionConfig = gatedMarketplace.koCommissionOverrideForSale(event.params._saleId);

        gatedSale.primarySaleCommission = commissionConfig.value0
            ? commissionConfig.value1
            : gatedMarketplace.platformPrimaryCommission();

        gatedSale.save();
    }
}

