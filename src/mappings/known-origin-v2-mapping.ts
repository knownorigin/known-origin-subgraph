import {
    KnownOrigin,
    Purchase,
    Minted,
    EditionCreated,
    Transfer,
    KnownOrigin__detailsOfEditionResult
} from "../../generated/KnownOrigin/KnownOrigin"

import {
    loadOrCreateEdition,
    loadOrCreateEditionFromTokenId
} from "../services/Edition.service";
import {
    addEditionToDay,
    recordDayCounts,
    recordDayIssued,
    recordDayTransfer,
    recordDayValue
} from "../services/Day.service";
import {
    addEditionToArtist,
    recordArtistValue,
    recordArtistCounts,
    recordArtistIssued,
} from "../services/Artist.service";
import {loadOrCreateToken} from "../services/Token.service";
import {ethereum, log, Address} from "@graphprotocol/graph-ts/index";
import {toEther} from "../utils";
import {ONE, ZERO} from "../constants";
import {createTransferEvent} from "../services/TransferEvent.factory";
import {
    addPrimarySaleToCollector,
    collectorInList,
    loadOrCreateCollector
} from "../services/Collector.service";
import {getArtistAddress} from "../services/AddressMapping.service";
import {
    createTokenPrimaryPurchaseEvent,
    createTokenTransferEvent
} from "../services/TokenEvent.factory";
import {updateTokenOfferOwner} from "../services/Offers.service";

import {
    recordEditionCreated,
    recordTransfer,
    recordPrimarySale,
} from "../services/ActivityEvent.service";

export function handleEditionCreated(event: EditionCreated): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.save()

    addEditionToDay(event, editionEntity.id);

    // Update artist
    let _editionDataResult: ethereum.CallResult<KnownOrigin__detailsOfEditionResult> = contract.try_detailsOfEdition(event.params._editionNumber)
    if (!_editionDataResult.reverted) {
        let _editionData = _editionDataResult.value;
        addEditionToArtist(_editionData.value4, event.params._editionNumber.toString(), _editionData.value9, event.block.timestamp)
    } else {
        log.error("Handled unknown reverted detailsOfEdition() call for {}", [event.params._editionNumber.toString()]);
    }

    recordEditionCreated(event, editionEntity)
}

export function handleTransfer(event: Transfer): void {
    log.info("handleTransfer() called for event address {}", [event.address.toHexString()]);

    let contract = KnownOrigin.bind(event.address)

    ///////////////
    // Transfers //
    ///////////////

    // Transfer Events
    let transferEvent = createTransferEvent(event);
    transferEvent.save();

    // Token Events
    let tokenTransferEvent = createTokenTransferEvent(event);
    tokenTransferEvent.save();

    ////////////////
    // Day Counts //
    ////////////////

    recordDayTransfer(event);

    /////////////////////
    // Collector Logic //
    /////////////////////

    let collector = loadOrCreateCollector(event.params._to, event.block);
    collector.save();

    ///////////////////
    // Edition Logic //
    ///////////////////

    // Record transfer against the edition
    let editionEntity = loadOrCreateEditionFromTokenId(event.params._tokenId, event.block, contract);

    // Set Transfers on edition
    let editionTransfers = editionEntity.transfers;
    editionTransfers.push(transferEvent.id);
    editionEntity.transfers = editionTransfers;

    // Check if the edition already has the owner
    if (!collectorInList(collector, editionEntity.allOwners)) {
        let allOwners = editionEntity.allOwners;
        allOwners.push(collector.id);
        editionEntity.allOwners = allOwners;
    }

    // Tally up current owners of edition
    if (!collectorInList(collector, editionEntity.currentOwners)) {
        let currentOwners = editionEntity.currentOwners;
        currentOwners.push(collector.id);
        editionEntity.currentOwners = currentOwners;
    }

    editionEntity.save();
    /////////////////
    // Token Logic //
    /////////////////

    // TOKEN
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)

    // set birth on Token
    if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
        tokenEntity.birthTimestamp = event.block.timestamp
    }

    // Record transfer against token
    let tokenTransfers = tokenEntity.transfers;
    tokenTransfers.push(transferEvent.id);
    tokenEntity.transfers = tokenTransfers;

    // Check if the token already has the owner
    if (!collectorInList(collector, tokenEntity.allOwners)) {
        let allOwners = tokenEntity.allOwners;
        allOwners.push(collector.id);
        tokenEntity.allOwners = allOwners;
    }

    // Keep track of current owner
    tokenEntity.currentOwner = collector.id;

    // Update counters and timestamps
    tokenEntity.lastTransferTimestamp = event.block.timestamp
    tokenEntity.transferCount = tokenEntity.transferCount.plus(ONE)

    // Persist
    tokenEntity.save();

    // Update token offer owner
    if (event.params._to !== event.params._from) {
        updateTokenOfferOwner(event.block, contract, event.params._tokenId, event.params._to)
    }

    recordTransfer(event, tokenEntity, editionEntity, event.params._to)
}

// Direct primary "Buy it now" purchase form the website
export function handlePurchase(event: Purchase): void {
    let contract = KnownOrigin.bind(event.address)

    // Create token
    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.save()

    // Create collector
    let collector = loadOrCreateCollector(event.params._buyer, event.block);
    collector.save();

    // Record Artist Data
    let editionNumber = event.params._editionNumber
    let artistAddress = getArtistAddress(contract.artistCommission(editionNumber).value0)

    recordArtistValue(artistAddress, event.params._tokenId, event.transaction.value)
    recordDayValue(event, event.params._tokenId, event.transaction.value)

    recordDayCounts(event, event.transaction.value)
    recordArtistCounts(artistAddress, event.transaction.value)

    // Action edition data changes
    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)
    editionEntity.totalEthSpentOnEdition = editionEntity.totalEthSpentOnEdition.plus(toEther(event.params._priceInWei));

    // Only count Purchases with value attached as sale - primary sales trigger this event
    if (event.transaction.value > ZERO) {
        // Record sale against the edition
        let sales = editionEntity.sales
        sales.push(event.params._tokenId.toString())
        editionEntity.sales = sales
        editionEntity.totalSold = editionEntity.totalSold.plus(ONE)

        // Tally up primary sale owners
        if (!collectorInList(collector, editionEntity.primaryOwners)) {
            let primaryOwners = editionEntity.primaryOwners;
            primaryOwners.push(collector.id);
            editionEntity.primaryOwners = primaryOwners;
        }

        addPrimarySaleToCollector(event.block, event.params._buyer, event.params._priceInWei);

        let tokenTransferEvent = createTokenPrimaryPurchaseEvent(event);
        tokenTransferEvent.save();

        // Set price against token
        let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
        tokenEntity.primaryValueInEth = toEther(event.params._priceInWei)
        tokenEntity.lastSalePriceInEth = toEther(event.params._priceInWei)
        tokenEntity.save()
    }
    editionEntity.save()

    recordPrimarySale(event, editionEntity, tokenEntity, event.params._priceInWei, event.params._buyer)
}

// A token has been issued - could be purchase, gift, accepted offer
export function handleMinted(event: Minted): void {
    let contract = KnownOrigin.bind(event.address)

    let editionEntity = loadOrCreateEdition(event.params._editionNumber, event.block, contract)

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

    let tokenEntity = loadOrCreateToken(event.params._tokenId, contract, event.block)
    tokenEntity.save();

    // record running total of issued tokens
    recordDayIssued(event, event.params._tokenId)

    let editionNumber = event.params._editionNumber
    let artistAddress = getArtistAddress(contract.artistCommission(editionNumber).value0)
    recordArtistIssued(artistAddress)
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
//     let editionEntity = loadOrCreateEdition(editionNumber, call.block, contract)
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
