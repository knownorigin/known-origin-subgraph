import {Address, ethereum, log, store} from "@graphprotocol/graph-ts/index";
import {
    Transfer,
    KnownOriginV3,
    ConsecutiveTransfer,
    AdminRoyaltiesRegistryProxySet,
    AdminTokenUriResolverSet,
    AdminUpdateSecondaryRoyalty,
    AdminArtistAccountReported,
    AdminEditionReported,
} from "../../generated/KnownOriginV3/KnownOriginV3";
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
import {BigInt} from "@graphprotocol/graph-ts";
import {getPlatformConfig} from "../services/PlatformConfig.factory";


export function handleTransfer(event: Transfer): void {
    log.info("KO V3 handleTransfer() called for token {}", [event.params.tokenId.toString()]);
    _handlerTransfer(event, event.params.from, event.params.to, event.params.tokenId);
}

export function handleConsecutiveTransfer(event: ConsecutiveTransfer): void {
    log.info("KO V3 handleConsecutiveTransfer() called for token from {} to {}", [
        event.params.fromTokenId.toString(),
        event.params.toTokenId.toString(),
    ]);
    let fromId = event.params.fromTokenId.toI32();
    let toId = event.params.toTokenId.toI32();
    for (let i = fromId; i < toId; i++) {
        _handlerTransfer(event, event.params.fromAddress, event.params.toAddress, BigInt.fromI32(i));
    }
}

function _handlerTransfer(event: ethereum.Event, from: Address, to: Address, tokenId: BigInt): void {

    let kodaV3Contract = KnownOriginV3.bind(event.address);

    // From zero - token birth
    if (from === ZERO_ADDRESS) {

        // FIXME proper mappings for V3 addresses
        // create edition
        let editionEntity = loadOrCreateV3EditionFromTokenId(tokenId, event.block, kodaV3Contract);
        editionEntity.save()

        // We only need to record the edition being created once
        if (editionEntity.editionNmber.equals(tokenId)) {
            addEditionToDay(event, editionEntity.id);

            let creator = kodaV3Contract.getCreatorOfToken(tokenId);
            addEditionToArtist(creator, editionEntity.editionNmber.toString(), editionEntity.totalAvailable, event.block.timestamp)

            recordEditionCreated(event, editionEntity)
        }

    } else {
        // Day Counts

        recordDayTransfer(event);

        // Collector Logic

        let collector = loadOrCreateCollector(to, event.block);
        collector.save();

        // Edition Logic

        // Record transfer against the edition
        let editionEntity = loadOrCreateV3EditionFromTokenId(tokenId, event.block, kodaV3Contract);

        // Transfer Events
        let transferEvent = createTransferEvent(event, tokenId, from, to, editionEntity);
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

        /////////////////
        // Token Logic //
        /////////////////

        // TOKEN
        let tokenEntity = loadOrCreateV3Token(tokenId, kodaV3Contract, event.block)

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

        ////////////////////////////////////////
        // Secondary market - pricing listing //
        ////////////////////////////////////////

        // Clear token price listing fields
        tokenEntity.isListed = false;
        tokenEntity.listPrice = ZERO_BIG_DECIMAL
        tokenEntity.lister = null
        tokenEntity.listingTimestamp = ZERO

        // Clear price listing
        store.remove("ListedToken", tokenId.toString());

        // Persist
        tokenEntity.save();

        // Update token offer owner
        // FIXME re-enable this
        // if (to !== from) {
        //     updateTokenOfferOwner(event.block, contract, tokenId, to)
        // }

        recordTransfer(event, tokenEntity, editionEntity, to)

        ///////////////
        // Transfers //
        ///////////////

        // Token Events
        let tokenTransferEvent = createTokenTransferEvent(event, tokenId, from, to);
        tokenTransferEvent.save();
    }
}

export function handleAdminRoyaltiesRegistryProxySet(event: AdminRoyaltiesRegistryProxySet): void {
    let marketConfig = getPlatformConfig()
    marketConfig.royaltiesRegistry = event.params._royaltiesRegistryProxy;
    marketConfig.save();
}

export function handleAdminTokenUriResolverSet(event: AdminTokenUriResolverSet): void {
    let marketConfig = getPlatformConfig()
    marketConfig.tokenUriResolver = event.params._tokenUriResolver;
    marketConfig.save();
}

export function handleAdminUpdateSecondaryRoyalty(event: AdminUpdateSecondaryRoyalty): void {
    let marketConfig = getPlatformConfig()
    marketConfig.secondarySaleRoyalty = event.params._secondarySaleRoyalty;
    marketConfig.save();
}

export function handleAdminArtistAccountReported(event: AdminArtistAccountReported): void {
    // FIXME finds all editions from the artist - disable them
}

export function handleAdminEditionReported(event: AdminEditionReported): void {
    // FIXME find edition and disable
}
