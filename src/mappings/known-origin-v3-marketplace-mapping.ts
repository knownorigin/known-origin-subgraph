import {log} from "@graphprotocol/graph-ts/index";

import {
    AdminUpdateModulo,
    AdminUpdateMinBidAmount,
    AdminUpdateSecondaryRoyalty,
    AdminUpdatePlatformPrimarySaleCommission,
    AdminUpdateSecondarySaleCommission
} from "../../generated/KnownOriginV3/KnownOriginV3";

import {
    EditionAcceptingOffer, EditionBidAccepted, EditionBidPlaced, EditionBidRejected, EditionBidWithdrawn,
    EditionDeListed,
    EditionListed,
    EditionPriceChanged, EditionPurchased
} from "../../generated/KODAV3Marketplace/KODAV3Marketplace";

import {getPlatformConfig} from "../services/PlatformConfig.factory";

import {loadNonNullableEdition, loadOrCreateV2Edition} from "../services/Edition.service";
import {getKnownOriginV2ForAddress} from "../services/KnownOrigin.factory";
import {createBidPlacedEvent} from "../services/AuctionEvent.factory";
import {
    recordDayBidPlacedCount,
    recordDayTotalValueCycledInBids,
    recordDayTotalValuePlaceInBids
} from "../services/Day.service";
import {recordActiveEditionBid} from "../services/AuctionEvent.service";
import {recordPrimaryBidPlaced} from "../services/ActivityEvent.service";
import {recordEditionOffer} from "../services/Offers.service";

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

export function handleAdminUpdateSecondaryRoyalty(event: AdminUpdateSecondaryRoyalty): void {
    log.info("KO V3 handleAdminUpdateSecondaryRoyalty() called - secondarySaleRoyalty {}", [event.params._secondarySaleRoyalty.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.secondarySaleRoyalty = event.params._secondarySaleRoyalty;
    marketConfig.save();
}

export function handleAdminUpdatePlatformPrimarySaleCommission(event: AdminUpdatePlatformPrimarySaleCommission): void {
    log.info("KO V3 handleAdminUpdatePlatformPrimarySaleCommission() called - platformPrimarySaleCommission {}", [event.params._platformPrimarySaleCommission.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.primarySaleCommission = event.params._platformPrimarySaleCommission;
    marketConfig.save();
}

export function handleAdminUpdateSecondarySaleCommission(event: AdminUpdateSecondarySaleCommission): void {
    log.info("KO V3 handleAdminUpdatePlatformPrimarySaleCommission() called - platformSecondarySaleCommission {}", [event.params._platformSecondarySaleCommission.toString()]);
    let marketConfig = getPlatformConfig()
    marketConfig.marketplaceSecondarySaleRoyalty = event.params._platformSecondarySaleCommission;
    marketConfig.save();
}

/////////////////////
// Edition Buy Now //
/////////////////////

export function handleEditionPriceChanged(event: EditionPriceChanged): void {
    log.info("KO V3 handleEditionPriceChanged() called - editionId {}", [event.params._editionId.toString()]);
}

export function handleEditionListed(event: EditionListed): void {
    log.info("KO V3 handleEditionListed() called - editionId {}", [event.params._editionId.toString()]);
}

export function handleEditionDeListed(event: EditionDeListed): void {
    log.info("KO V3 handleEditionDeListed() called - editionId {}", [event.params._editionId.toString()]);
}

export function handleEditionPurchased(event: EditionPurchased): void {
    log.info("KO V3 handleEditionPurchased() called - editionId {}", [event.params._editionId.toString()]);
}

////////////////////
// Edition Offers //
////////////////////

export function handleEditionAcceptingOffer(event: EditionAcceptingOffer): void {
    log.info("KO V3 handleEditionAcceptingOffer() called - editionId {}", [event.params._editionId.toString()]);

    // clear out offers

    let editionEntity = loadNonNullableEdition(event.params._editionId)
    editionEntity.auctionEnabled = true
    editionEntity.offersOnly = true
    editionEntity.activeBid = null
    editionEntity.save()
}

export function handleEditionBidPlaced(event: EditionBidPlaced): void {
    log.info("KO V3 handleEditionBidPlaced() called - editionId {}", [event.params._editionId.toString()]);

    let editionEntity = loadNonNullableEdition(event.params._editionId)

    let auctionEvent = createBidPlacedEvent(event.block, event.transaction, editionEntity, event.params._bidder, event.params._amount);
    auctionEvent.save()

    let biddingHistory = editionEntity.biddingHistory
    biddingHistory.push(auctionEvent.id.toString())
    editionEntity.biddingHistory = biddingHistory
    editionEntity.save()

    recordDayBidPlacedCount(event)

    recordDayTotalValueCycledInBids(event, event.params._amount)
    recordDayTotalValuePlaceInBids(event, event.params._amount)

    recordActiveEditionBid(event.params._editionId, auctionEvent)

    // TODO re-enable
    // recordEditionOffer(event.block, event.transaction, contract, event.params._bidder, event.params._amount, event.params._editionId)

    recordPrimaryBidPlaced(event, editionEntity, event.params._amount, event.params._bidder)
}

export function handleEditionBidWithdrawn(event: EditionBidWithdrawn): void {
    log.info("KO V3 handleEditionBidWithdrawn() called - editionId {}", [event.params._editionId.toString()]);
}

export function handleEditionBidAccepted(event: EditionBidAccepted): void {
    log.info("KO V3 handleEditionBidAccepted() called - editionId {}", [event.params._editionId.toString()]);
}

export function handleEditionBidRejected(event: EditionBidRejected): void {
    log.info("KO V3 handleEditionBidRejected() called - editionId {}", [event.params._editionId.toString()]);
}
