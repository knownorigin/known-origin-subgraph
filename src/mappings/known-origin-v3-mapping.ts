import {log, store} from "@graphprotocol/graph-ts/index";
import {Transfer, KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";
import {ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {
    loadOrCreateV3EditionFromTokenId
} from "../services/Edition.service";
import {addEditionToDay, recordDayTransfer} from "../services/Day.service";
import {addEditionToArtist} from "../services/Artist.service";
import {recordEditionCreated, recordTransfer} from "../services/ActivityEvent.service";
import {collectorInList, loadOrCreateCollector} from "../services/Collector.service";
import {createTransferEvent} from "../services/TransferEvent.factory";
import {createTokenTransferEvent} from "../services/TokenEvent.factory";
import {loadOrCreateV3Token} from "../services/Token.service";
import * as KodaVersions from "../KodaVersions";


export function handleTransfer(event: Transfer): void {
    log.info("handleTransfer() called for event address {}", [event.address.toHexString()]);

    if (event.params.from === ZERO_ADDRESS) {

        // FIXME
        // create edition
        let kodaV3Contract = KnownOriginV3.bind(event.address);
        let editionEntity = loadOrCreateV3EditionFromTokenId(event.params.tokenId, event.block, kodaV3Contract);
        editionEntity.save()

        // We only need to record the edition being created one
        if (editionEntity.editionNmber.equals(event.params.tokenId)) {
            addEditionToDay(event, editionEntity.id);

            let creator = kodaV3Contract.getCreatorOfToken(event.params.tokenId);
            addEditionToArtist(creator, editionEntity.editionNmber.toString(), editionEntity.totalAvailable, event.block.timestamp)

            recordEditionCreated(event, editionEntity)
        }
    } else {
        ////////////////
        // Day Counts //
        ////////////////

        recordDayTransfer(event);

        /////////////////////
        // Collector Logic //
        /////////////////////

        let collector = loadOrCreateCollector(event.params.to, event.block);
        collector.save();

        ///////////////////
        // Edition Logic //
        ///////////////////
        let kodaV3Contract = KnownOriginV3.bind(event.address);

        // Record transfer against the edition
        let editionEntity = loadOrCreateV3EditionFromTokenId(event.params.tokenId, event.block, kodaV3Contract);

        // Transfer Events
        let transferEvent = createTransferEvent(event, event.params.tokenId, event.params.from, event.params.to, editionEntity);
        transferEvent.save();

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

        ///////////////
        // Transfers //
        ///////////////

        // Token Events
        let tokenTransferEvent = createTokenTransferEvent(event, KodaVersions.KODA_V3, event.params.tokenId, event.params.from, event.params.to);
        tokenTransferEvent.save();

        /////////////////
        // Token Logic //
        /////////////////

        // TOKEN
        let tokenEntity = loadOrCreateV3Token(event.params.tokenId, kodaV3Contract, event.block)

        // FIXME assume this logic is valid?
        // set birth of the token to when the edition was created as we dont add subgraph token data until this event
        if (tokenEntity.birthTimestamp.equals(ZERO)) {
            tokenEntity.birthTimestamp = editionEntity.createdTimestamp
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

        // ////////////////////////////////////////
        // // Secondary market - pricing listing //
        // ////////////////////////////////////////

        // Clear token price listing fields
        tokenEntity.isListed = false;
        tokenEntity.listPrice = ZERO_BIG_DECIMAL
        tokenEntity.lister = null
        tokenEntity.listingTimestamp = ZERO

        // Clear price listing
        store.remove("ListedToken", event.params.tokenId.toString());

        // Persist
        tokenEntity.save();

        // Update token offer owner
        // FIXME re-enable this
        // if (event.params.to !== event.params.from) {
        //     updateTokenOfferOwner(event.block, contract, event.params.tokenId, event.params.to)
        // }

        recordTransfer(event, tokenEntity, editionEntity, event.params.to)
    }
}


