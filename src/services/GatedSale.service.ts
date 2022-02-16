import {GatedSale, Phase} from "../../generated/schema";
import {BigInt} from "@graphprotocol/graph-ts/index";
import {
    KODAV3UpgradableGatedMarketplace
} from "../../generated/KODAV3UpgradableGatedMarketplace/KODAV3UpgradableGatedMarketplace";
import {loadOrCreateCollector} from "./Collector.service";

export function loadOrCreateGatedSale(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt): GatedSale {
    let gatedSale = GatedSale.load(saleId.toString());

    if (gatedSale == null) {
        gatedSale = new GatedSale(saleId.toString());
        gatedSale.editionId = editionId;
        gatedSale.phases = new Array<string>();
        gatedSale.paused = false;

        // Get the sales commission
        let salesCommission = gatedMarketplace.saleCommission(saleId)
        if (salesCommission == BigInt.fromString("0")) {
            // TODO this should not be hard coded - call contract to check default commission
            salesCommission = BigInt.fromString("15")
        }
        gatedSale.primarySaleCommission = salesCommission

        let phases = gatedSale.phases

        for (let i = 0; i < 3; i++) {
            // Try and create the phase
            let phase = loadOrCreateGatedSalePhase(gatedMarketplace, saleId, editionId, BigInt.fromString(`${i}`))
            if (phase != null) {
                phases.push(phase.id)
            }
        }

        gatedSale.phases = phases

        gatedSale.save();
    }

    return gatedSale as GatedSale;
}

export function loadNonNullableGatedSale(saleId: BigInt): GatedSale | null {
    return GatedSale.load(saleId.toString());
}

function createPhaseId(saleId: BigInt, editionId: BigInt, phaseId: BigInt) {
    return saleId.toString()
        .concat("-")
        .concat(editionId.toString())
        .concat("-")
        .concat(phaseId.toString());
}

export function loadOrCreateGatedSalePhase(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt, phaseId: BigInt): Phase {
    let phase = Phase.load(saleId.toString());

    if (phase == null) {
        const phaseDetails = gatedMarketplace.try_phases(saleId, phaseId)
        if (!phaseDetails.reverted) {
            let _phaseData = phaseDetails.value;

            const ID = createPhaseId(saleId, editionId, phaseId)

            phase = new Phase(ID);
            phase.saleId = saleId.toString();
            phase.editionId = editionId.toString();
            phase.phaseId = phaseId.toString();


            phase.startTime = _phaseData.value0;
            phase.endTime = _phaseData.value1;
            phase.walletMintLimit = BigInt.fromI32(_phaseData.value2);
            phase.priceInWei = _phaseData.value3;
            phase.merkleRoot = _phaseData.value4;
            phase.merkleIPFSHash = _phaseData.value5;
            phase.mintCap = _phaseData.value6;
            phase.mintCounter = _phaseData.value7;
            phase.save();
        }
    }

    return phase as Phase;
}

export function removePhaseFromSale(saleId: BigInt, editionId: BigInt, phaseId: BigInt) {
    let sale = loadNonNullableGatedSale(saleId);
    let salePhases = new Array<string>()
    let existingPhases = sale.phases;

    let expectedPhaseId = createPhaseId(saleId, editionId, phaseId)

    for (let i = 0; i < existingPhases.length; i++) {
        let currentPhaseId = existingPhases[i];
        if (currentPhaseId.toString() !== expectedPhaseId) {
            salePhases.push(currentPhaseId)
        }
    }
    sale.phases = salePhases;
    sale.save();
    return sale
}