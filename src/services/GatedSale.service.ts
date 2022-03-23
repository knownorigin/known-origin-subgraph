import {GatedSale, Phase, PhaseMintCount} from "../../generated/schema";
import {BigInt} from "@graphprotocol/graph-ts/index";
import {KODAV3UpgradableGatedMarketplace} from "../../generated/KODAV3UpgradableGatedMarketplace/KODAV3UpgradableGatedMarketplace";
import * as editionService from "./Edition.service";
import {ONE} from "../utils/constants";

export function loadOrCreateGatedSale(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt): GatedSale {
    let gatedSale = GatedSale.load(saleId.toString());

    if (gatedSale == null) {
        gatedSale = new GatedSale(saleId.toString());
        gatedSale.editionId = editionId;
        gatedSale.phases = new Array<string>();
        gatedSale.paused = false;

        let salesCommission = gatedMarketplace.platformPrimaryCommission();
        // Get the sales commission
        let commissionConfig = gatedMarketplace.koCommissionOverrideForSale(saleId)
        if (commissionConfig.value0) {
            salesCommission = commissionConfig.value1
        }
        gatedSale.primarySaleCommission = salesCommission

        // Note: dont setup phases as these are driven from their own events

        let edition = editionService.loadNonNullableEdition(editionId);
        if (edition.artistAccount !== null) {
            gatedSale.artistAccount = edition.artistAccount.toHexString()
        }

        gatedSale.save();
    }

    return gatedSale as GatedSale;
}

export function recordSaleMintCount(saleId: BigInt, editionId: BigInt, phaseId: BigInt): void {
    let sale = loadNonNullableGatedSale(saleId);
    sale.mintCount = sale.mintCount.plus(ONE)
    sale.save()

    let phase = loadNonNullableGatedPhase(createPhaseId(saleId, editionId, phaseId));
    phase.mintCount = phase.mintCount.plus(ONE)
    phase.save()
}

export function recordAddressMintCount(saleId: BigInt, editionId: BigInt, phaseId: BigInt, minter: string): void {
    let ID = createPhaseMintCountId(saleId, editionId, phaseId, minter);

    let phaseMintCount = PhaseMintCount.load(ID);

    if (phaseMintCount == null) {
        phaseMintCount = new PhaseMintCount(ID)
        phaseMintCount.count = ONE
        phaseMintCount.saleId = saleId.toString()
        phaseMintCount.editionId = editionId.toString()
        phaseMintCount.phaseId = phaseId.toString()
        phaseMintCount.minter = minter
    } else {
        phaseMintCount.count = phaseMintCount.count.plus(ONE)
    }
    phaseMintCount.save()
}

export function loadNonNullableGatedSale(saleId: BigInt): GatedSale {
    return GatedSale.load(saleId.toString()) as GatedSale;
}

export function loadNonNullableGatedPhase(phaseId: string): Phase {
    return Phase.load(phaseId) as Phase;
}

export function createPhaseId(saleId: BigInt, editionId: BigInt, phaseId: BigInt): string {
    return saleId.toString()
        .concat("-")
        .concat(editionId.toString())
        .concat("-")
        .concat(phaseId.toString());
}

export function createPhaseMintCountId(saleId: BigInt, editionId: BigInt, phaseId: BigInt, minter: string): string {
    return saleId.toString()
        .concat("-")
        .concat(editionId.toString())
        .concat("-")
        .concat(phaseId.toString())
        .concat("-")
        .concat(minter.toString());
}

export function loadOrCreateGatedSalePhase(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt, phaseId: BigInt): Phase {
    let ID = createPhaseId(saleId, editionId, phaseId)
    let phase = Phase.load(ID.toString());

    if (phase == null) {
        let phaseDetails = gatedMarketplace.try_phases(saleId, phaseId)
        if (!phaseDetails.reverted) {
            let _phaseData = phaseDetails.value;

            phase = new Phase(ID);
            phase.saleId = saleId.toString();
            phase.editionId = editionId.toString();
            phase.phaseId = phaseId.toString();

            phase.startTime = _phaseData.value0;
            phase.endTime = _phaseData.value1;
            phase.priceInWei = _phaseData.value2;
            phase.mintCount = BigInt.fromI32(_phaseData.value3);
            phase.mintCap = BigInt.fromI32(_phaseData.value4);
            phase.walletMintLimit = BigInt.fromI32(_phaseData.value5);
            phase.merkleRoot = _phaseData.value6;
            phase.merkleIPFSHash = _phaseData.value7;
            phase.save();
        }
    }

    return phase as Phase;
}

export function removePhaseFromSale(saleId: BigInt, editionId: BigInt, phaseId: BigInt): void {
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
}
