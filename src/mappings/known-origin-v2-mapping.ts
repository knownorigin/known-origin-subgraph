import {
    Approval,
    ApprovalForAll,
    EditionCreated,
    KnownOriginV2,
    KnownOriginV2__detailsOfEditionResult,
    Minted,
    Purchase,
    Transfer
} from "../../generated/KnownOriginV2/KnownOriginV2"

import { Address, BigInt, ethereum, log, store } from "@graphprotocol/graph-ts/index";
import {ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../utils/constants";

import {toEther} from "../utils/utils";

import {getArtistAddress} from "../services/AddressMapping.service";

import * as EVENT_TYPES from "../utils/EventTypes";
import * as SaleTypes from "../utils/SaleTypes";

import * as editionService from "../services/Edition.service";
import * as dayService from "../services/Day.service";
import * as tokenService from "../services/Token.service";
import * as transferEventFactory from "../services/TransferEvent.factory";
import * as artistService from "../services/Artist.service";
import * as collectorService from "../services/Collector.service";
import * as tokenEventFactory from "../services/TokenEvent.factory";
import * as offerService from "../services/Offers.service";
import * as activityEventService from "../services/ActivityEvent.service";

import {
    KODA_V2_MAINNET_SECONDARY_MARKETPLACE,
    KODA_V2_RINKEBY_SECONDARY_MARKETPLACE
} from "../utils/KODAV2AddressLookup";
import * as KodaVersions from "../utils/KodaVersions";
import * as approvalService from "../services/Approval.service";

export function handleEditionCreated(event: EditionCreated): void {
    let contract = KnownOriginV2.bind(event.address)

    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.save()

    dayService.addEditionToDay(event, editionEntity.id);

    // Update artist
    let _editionDataResult: ethereum.CallResult<KnownOriginV2__detailsOfEditionResult> = contract.try_detailsOfEdition(event.params._editionNumber)
    if (!_editionDataResult.reverted) {
        let _editionData = _editionDataResult.value;
        artistService.addEditionToArtist(_editionData.value4, event.params._editionNumber.toString(), _editionData.value9, event.block.timestamp)
    } else {
        log.error("Handled unknown reverted detailsOfEdition() call for {}", [event.params._editionNumber.toString()]);
    }

    activityEventService.recordEditionCreated(event, editionEntity)
}

export function handleTransfer(event: Transfer): void {
    log.info("KO V2 handleTransfer() called for event address {}", [event.params._tokenId.toString()]);

    let contract = KnownOriginV2.bind(event.address)

    ////////////////
    // Day Counts //
    ////////////////

    dayService.recordDayTransfer(event);

    /////////////////////
    // Collector Logic //
    /////////////////////

    // add tokens to collector
    let collector = collectorService.addTokenToCollector(event.params._to, event.block, event.params._tokenId);
    collector.save();

    // remove tokens from collector
    collectorService.removeTokenFromCollector(event.params._from, event.block, event.params._tokenId);

    ///////////////////
    // Edition Logic //
    ///////////////////

    // Record transfer against the edition
    let editionEntity = editionService.loadOrCreateV2EditionFromTokenId(event.params._tokenId, event.block, contract);

    // Transfer Events
    let transferEvent = transferEventFactory.createTransferEvent(event, event.params._tokenId, event.params._from, event.params._to, editionEntity);
    transferEvent.save();

    // Set Transfers on edition
    let editionTransfers = editionEntity.transfers;
    editionTransfers.push(transferEvent.id);
    editionEntity.transfers = editionTransfers;

    // Check if the edition already has the owner
    if (!collectorService.collectorInList(collector, editionEntity.allOwners)) {
        let allOwners = editionEntity.allOwners;
        allOwners.push(collector.id);
        editionEntity.allOwners = allOwners;
    }

    // Tally up current owners of edition
    if (!collectorService.collectorInList(collector, editionEntity.currentOwners)) {
        let currentOwners = editionEntity.currentOwners;
        currentOwners.push(collector.id);
        editionEntity.currentOwners = currentOwners;
    }

    editionEntity.save();

    /////////////////
    // Token Logic //
    /////////////////

    // TOKEN
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)

    // Ensure approval for token ID is cleared
    let approved = contract.getApproved(event.params._tokenId);
    if (!approved.equals(ZERO_ADDRESS)) {
        tokenEntity.revokedApproval = false;
    }

    // set birth on Token
    if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
        tokenEntity.birthTimestamp = event.block.timestamp
    }

    // Record transfer against token
    let tokenTransfers = tokenEntity.transfers;
    tokenTransfers.push(transferEvent.id);
    tokenEntity.transfers = tokenTransfers;

    // Check if the token already has the owner
    if (!collectorService.collectorInList(collector, tokenEntity.allOwners)) {
        let allOwners = tokenEntity.allOwners;
        allOwners.push(collector.id);
        tokenEntity.allOwners = allOwners;
    }

    // Keep track of current owner
    tokenEntity.currentOwner = collector.id;

    // Update counters and timestamps
    tokenEntity.lastTransferTimestamp = event.block.timestamp
    tokenEntity.transferCount = tokenEntity.transferCount.plus(ONE)

    ////////////////////////////////////////
    // Secondary market - pricing listing //
    ////////////////////////////////////////

    // Clear token price listing fields
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY
    tokenEntity.listPrice = ZERO_BIG_DECIMAL
    tokenEntity.lister = null
    tokenEntity.listingTimestamp = ZERO

    // Clear price listing
    store.remove("ListedToken", event.params._tokenId.toString());

    // Persist
    tokenEntity.save();

    // Update token offer owner
    if (event.params._to !== event.params._from) {
        offerService.updateTokenOfferOwner(event.block, event.params._tokenId, event.params._to)
    }

    activityEventService.recordTransfer(event, tokenEntity, editionEntity, event.params._to, event.params._from, event.transaction.value);

    // If we see a msg.value record it as a sale
    if (event.transaction.value.gt(ZERO)) {
        const primarySale = tokenEntity.transferCount.equals(BigInt.fromI32(1));
        tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, event.transaction.value, primarySale);
        tokenEntity.save();
    }

    ///////////////
    // Transfers //
    ///////////////

    // Token Events
    let tokenTransferEvent = tokenEventFactory.createTokenTransferEvent(event, event.params._tokenId, event.params._from, event.params._to);
    tokenTransferEvent.save();
}

// Direct primary "Buy it now" purchase form the website
export function handlePurchase(event: Purchase): void {
    log.info("KO V2 handlePurchase() called for event edition {}", [event.params._editionNumber.toHexString()]);

    let contract = KnownOriginV2.bind(event.address)

    // Create token
    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.save()

    // Create collector
    let collector = collectorService.loadOrCreateCollector(event.params._buyer, event.block);
    collector.save();

    // Record Artist Data
    let editionNumber = event.params._editionNumber
    let artistAddress = getArtistAddress(contract.artistCommission(editionNumber).value0)

    artistService.handleKodaV2CommissionSplit(contract, event.params._editionNumber, event.params._tokenId, event.transaction.value, true)

    dayService.recordDayValue(event, event.params._tokenId, event.transaction.value)
    dayService.recordDayCounts(event, event.transaction.value)

    // Action edition data changes
    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition.plus(toEther(event.params._priceInWei));

    // Only count Purchases with value attached as sale - primary sales trigger this event
    if (event.transaction.value > ZERO) {
        // Record sale against the edition
        let sales = editionEntity.sales
        sales.push(event.params._tokenId.toString())
        editionEntity.sales = sales
        editionEntity.totalSold = editionEntity.totalSold.plus(ONE)

        // Tally up primary sale owners
        if (!collectorService.collectorInList(collector, editionEntity.primaryOwners)) {
            let primaryOwners = editionEntity.primaryOwners;
            primaryOwners.push(collector.id);
            editionEntity.primaryOwners = primaryOwners;
        }

        collectorService.addPrimarySaleToCollector(event.block, event.params._buyer, event.params._priceInWei);

        let tokenTransferEvent = tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params._tokenId, event.params._buyer, event.params._priceInWei);
        tokenTransferEvent.save();

        // Set price against token
        let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
        tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, event.params._priceInWei, true)
        tokenEntity.save()
    }
    editionEntity.save()

    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, editionEntity, tokenEntity, event.params._priceInWei, event.params._buyer)
}

// A token has been issued - could be purchase, gift, accepted offer
export function handleMinted(event: Minted): void {
    let contract = KnownOriginV2.bind(event.address)

    let editionEntity = editionService.loadOrCreateV2Edition(event.params._editionNumber, event.block, contract)

    // Record supply being consumed (useful to know how many are left in a edition i.e. available = supply = remaining)
    editionEntity.totalSupply = editionEntity.totalSupply.plus(ONE)

    // Reduce remaining supply for each mint
    editionEntity.remainingSupply = editionEntity.remainingSupply.minus(ONE)

    // Maintain a list of tokenId issued from the edition
    let tokenIds = editionEntity.tokenIds
    tokenIds.push(event.params._tokenId)
    editionEntity.tokenIds = tokenIds

    // Save edition entity
    editionEntity.save();

    let tokenEntity = tokenService.loadOrCreateV2Token(event.params._tokenId, contract, event.block)
    tokenEntity.save();

    // record running total of issued tokens
    dayService.recordDayIssued(event, event.params._tokenId)

    let editionNumber = event.params._editionNumber
    let artistAddress = getArtistAddress(contract.artistCommission(editionNumber).value0)
    artistService.recordArtistIssued(artistAddress)
}

export function handleApprovalForAll(event: ApprovalForAll): void {
    log.info("KO V2 handleApprovalForAll() called - owner {} operator {} approved {}", [
        event.params._owner.toHexString(),
        event.params._operator.toHexString(),
        event.params._approved ? "TRUE" : "FALSE",
    ]);

    // Secondary Sale Marketplace V2 (mainnet & rinkeby)
    if (event.params._operator.equals(Address.fromString(KODA_V2_MAINNET_SECONDARY_MARKETPLACE))
        || event.params._operator.equals(Address.fromString(KODA_V2_RINKEBY_SECONDARY_MARKETPLACE))) {
        log.debug("KO V2 handleApprovalForAll() handling token approvals for owner {}", [
            event.params._owner.toHexString(),
        ]);
        approvalService.handleCollectorTokensApprovalChanged(event.block, event.params._owner, event.params._approved, KodaVersions.KODA_V2);
    }
}

export function handleApproval(event: Approval): void {
    log.info("KO V2 handleApproval() called - owner {} token {} approved {}", [
        event.params._owner.toHexString(),
        event.params._tokenId.toString(),
        event.params._approved ? "TRUE" : "FALSE",
    ]);

    // Secondary Sale Marketplace V2 (mainnet & rinkeby)
    if (event.params._approved.equals(Address.fromString(KODA_V2_MAINNET_SECONDARY_MARKETPLACE))
        || event.params._approved.equals(Address.fromString(KODA_V2_RINKEBY_SECONDARY_MARKETPLACE))) {
        log.debug("KO V2 handleApproval() handling token approvals for owner {}", [
            event.params._owner.toHexString(),
        ]);
        approvalService.handleSingleApproval(event.params._tokenId, event.params._owner, event.params._approved, KodaVersions.KODA_V2);
    }
}

// // Only called on Mainnet
// export function handleUpdateActive(call: UpdateActiveCall): void {
//     log.info("handleUpdateActive() for edition [{}]", [call.inputs._editionNumber.toString()]);
//     let contract = KnownOrigin.bind(Address.fromString(KODA_MAINNET))
//
//     let editionNumber = call.inputs._editionNumber
//
//     let active = contract.editionActive(editionNumber);
//
//     let editionEntity = editionService.loadOrCreateV2Edition(editionNumber, call.block, contract)
//     editionEntity.active = active;
//     editionEntity.totalAvailable = !active ? ZERO : editionEntity.totalAvailable;
//     editionEntity.save()
//
//     let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
//
//     // If not active - reduce counts
//     if (!active) {
//         artist.editionsCount = artist.editionsCount.minus(ONE);
//         artist.supply = artist.supply.minus(editionEntity.totalAvailable);
//     }
//     // If re-enabling - add counts
//     else {
//         artist.editionsCount = artist.editionsCount.plus(ONE);
//         artist.supply = artist.supply.plus(editionEntity.totalAvailable);
//     }
//
//     artist.save();
// }
