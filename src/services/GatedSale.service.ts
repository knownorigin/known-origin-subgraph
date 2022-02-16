import {GatedSale, Phase} from "../../generated/schema";
import {BigInt} from "@graphprotocol/graph-ts/index";
import {
    KODAV3UpgradableGatedMarketplace
} from "../../generated/KODAV3UpgradableGatedMarketplace/KODAV3UpgradableGatedMarketplace";

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

        // Create the phase
        let phase = loadOrCreateGatedSalePhase(gatedMarketplace, saleId, editionId, BigInt.fromString("0"))
        let phases = gatedSale.phases
        phases.push(phase.id)
        gatedSale.phases = phases

        gatedSale.save();
    }

    return gatedSale as GatedSale;
}

export function loadNonNullableGatedSale(saleId: BigInt): GatedSale | null {
    return GatedSale.load(saleId.toString());
}

export function loadOrCreateGatedSalePhase(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt, phaseId: BigInt): Phase {
    let phase = Phase.load(saleId.toString());

    if (phase == null) {
        const ID = saleId.toString()
            .concat("-")
            .concat(editionId.toString())
            .concat("-")
            .concat(phaseId.toString());

        phase = new Phase(ID);
        phase.saleId = saleId.toString();
        phase.editionId = editionId.toString();
        phase.phaseId = phaseId.toString();

        const phaseDetails = gatedMarketplace.phases(saleId, phaseId)
        phase.startTime = phaseDetails.value0;
        phase.endTime = phaseDetails.value1;
        phase.walletMintLimit = BigInt.fromI32(phaseDetails.value2);
        phase.priceInWei = phaseDetails.value3;
        phase.merkleRoot = phaseDetails.value4;
        phase.merkleIPFSHash = phaseDetails.value5;
        phase.mintCap = phaseDetails.value6;
        phase.mintCounter = phaseDetails.value7;
        phase.save();
    }

    return phase as Phase;
}
