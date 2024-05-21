import {GatedSale, Phase, PhaseMintCount} from "../../generated/schema";
import {BigInt, Bytes} from "@graphprotocol/graph-ts/index";
import {KODAV3UpgradableGatedMarketplace} from "../../generated/KODAV3UpgradableGatedMarketplace/KODAV3UpgradableGatedMarketplace";
import * as editionService from "./Edition.service";
import {ONE, ZERO} from "../utils/constants";

export function loadOrCreateGatedSale(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt): GatedSale {
    let gatedSale = GatedSale.load(Bytes.fromI32(saleId));

    if (gatedSale == null) {
        gatedSale = new GatedSale(Bytes.fromI32(saleId));
        gatedSale.editionId = editionId.toString();
        gatedSale.phases = new Array<Bytes>();
        gatedSale.paused = false;
        gatedSale.mintCount = ZERO;

        let salesCommission = gatedMarketplace.platformPrimaryCommission();
        // Get the sales commission
        let commissionConfig = gatedMarketplace.koCommissionOverrideForSale(saleId)
        if (commissionConfig.value0) {
            salesCommission = commissionConfig.value1
        }
        gatedSale.primarySaleCommission = salesCommission

        // Note: dont setup phases as these are driven from their own events

        let edition = editionService.loadNonNullableEdition(editionId.toString());
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
    return GatedSale.load(Bytes.fromI32(saleId)) as GatedSale;
}

export function loadNonNullableGatedPhase(phaseId: Bytes): Phase {
    return Phase.load(phaseId) as Phase;
}

export function createPhaseId(saleId: BigInt, editionId: BigInt, phaseId: BigInt): Bytes {
    return Bytes.fromUTF8(saleId.toString()
        .concat("-")
        .concat(editionId.toString())
        .concat("-")
        .concat(phaseId.toString()));
}

export function createPhaseMintCountId(saleId: BigInt, editionId: BigInt, phaseId: BigInt, minter: string): Bytes {
    return Bytes.fromUTF8(saleId.toString()
        .concat("-")
        .concat(editionId.toString())
        .concat("-")
        .concat(phaseId.toString())
        .concat("-")
        .concat(minter.toString()));
}

export function loadOrCreateGatedSalePhase(gatedMarketplace: KODAV3UpgradableGatedMarketplace, saleId: BigInt, editionId: BigInt, phaseId: BigInt): Phase {
    let ID = createPhaseId(saleId, editionId, phaseId)
    let phase = Phase.load(ID);

    if (phase == null) {
        let phaseDetails = gatedMarketplace.try_phases(saleId, phaseId)
        if (!phaseDetails.reverted) {
            let _phaseData = phaseDetails.value;

            phase = new Phase(ID);
            phase.saleId = saleId.toString();
            phase.editionId = editionId.toString();
            phase.phaseId = phaseId.toString();
            phase.mintCount = ZERO;

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
    let salePhases = new Array<Bytes>()
    let existingPhases = sale.phases;

    let expectedPhaseId = createPhaseId(saleId, editionId, phaseId)

    for (let i = 0; i < existingPhases.length; i++) {
        let currentPhaseId = existingPhases[i];
        if (currentPhaseId.notEqual(expectedPhaseId)) {
            salePhases.push(currentPhaseId)
        }
    }
    sale.phases = salePhases;
    sale.save();
}
