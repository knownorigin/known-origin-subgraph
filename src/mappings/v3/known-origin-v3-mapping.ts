import {BigInt} from "@graphprotocol/graph-ts";
import {Address, ethereum, log, store} from "@graphprotocol/graph-ts/index";
import {
    Transfer,
    KnownOriginV3,
    ConsecutiveTransfer,
    AdminRoyaltiesRegistryProxySet,
    AdminTokenUriResolverSet,
    AdminUpdateSecondaryRoyalty,
    AdminArtistAccountReported,
    AdminEditionReported, Approval, ApprovalForAll,
} from "../../../generated/KnownOriginV3/KnownOriginV3";

import {ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../../utils/constants";

import {
    loadNonNullableEdition,
    loadOrCreateV3Edition,
    loadOrCreateV3EditionFromTokenId
} from "../../services/Edition.service";

import {addEditionToDay, recordDayTransfer} from "../../services/Day.service";
import {addEditionToArtist} from "../../services/Artist.service";
import {recordEditionCreated, recordTransfer} from "../../services/ActivityEvent.service";
import {collectorInList, loadOrCreateCollector} from "../../services/Collector.service";
import {createTransferEvent} from "../../services/TransferEvent.factory";
import {createTokenTransferEvent} from "../../services/TokenEvent.factory";
import {loadOrCreateV3Token} from "../../services/Token.service";
import {getPlatformConfig} from "../../services/PlatformConfig.factory";
import {updateTokenOfferOwner} from "../../services/Offers.service";
import {Artist, Collector, Token} from "../../../generated/schema";
import {PRIMARY_SALE_RINKEBY, SECONDARY_SALE_RINKEBY} from "../../utils/KODAV3";
import * as SaleTypes from "../../utils/SaleTypes";

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
    log.info("KO V3 _handlerTransfer() called for token {} - address from {} to {}", [
        tokenId.toString(),
        from.toHexString(),
        to.toHexString(),
    ]);

    let kodaV3Contract = KnownOriginV3.bind(event.address);

    // From zero - token birth
    if (from.equals(ZERO_ADDRESS)) {

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
        ////////////////
        // Day Counts //
        ////////////////

        recordDayTransfer(event);

        /////////////////////
        // Collector Logic //
        /////////////////////

        let collector = loadOrCreateCollector(to, event.block);
        collector.save();

        /////////////////
        // Token Logic //
        /////////////////

        // Token - save it so down stream things can use the token relationship
        let tokenEntity = loadOrCreateV3Token(tokenId, kodaV3Contract, event.block)
        tokenEntity.save();

        // Load it again
        tokenEntity = loadOrCreateV3Token(tokenId, kodaV3Contract, event.block)

        // Ensure approval for token ID is cleared
        let approved = kodaV3Contract.getApproved(tokenId);
        if (!approved.equals(ZERO_ADDRESS)) {
            tokenEntity.notForSale = false;
        }

        ///////////////
        // Transfers //
        ///////////////

        // Edition Logic

        // Record transfer against the edition
        let editionEntity = loadOrCreateV3Edition(tokenEntity.editionNumber, event.block, kodaV3Contract);

        // Transfer Events
        let transferEvent = createTransferEvent(event, tokenId, from, to, editionEntity);
        transferEvent.save();

        // Set Transfers on edition
        let editionTransfers = editionEntity.transfers;
        editionTransfers.push(transferEvent.id);
        editionEntity.transfers = editionTransfers;

        // @ts-ignore
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

        // Maintain a list of tokenId issued from the edition
        let tokenIds = editionEntity.tokenIds
        let foundTokenId = false;
        for (let i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i].equals(tokenId)) {
                foundTokenId = true;
            }
        }
        // if we dont know about this token, add it to the list
        if (!foundTokenId) tokenIds.push(tokenId)
        editionEntity.tokenIds = tokenIds

        let maxSize = kodaV3Contract.getSizeOfEdition(editionEntity.editionNmber);

        // Reduce remaining supply for each mint
        editionEntity.remainingSupply = maxSize.minus(BigInt.fromI32(tokenIds.length))

        // Record supply being consumed (useful to know how many are left in a edition i.e. available = supply = remaining)
        editionEntity.totalSupply = editionEntity.totalSupply.plus(ONE)

        editionEntity.save();

        ////////////////////
        // Set token data //
        ////////////////////

        // set birth of the token to when the edition was created as we dont add subgraph token data until this event
        if (tokenEntity.birthTimestamp.equals(ZERO)) {
            tokenEntity.birthTimestamp = editionEntity.createdTimestamp
        }

        // Record transfer against token
        let tokenTransfers = tokenEntity.transfers;
        // @ts-ignore
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
        tokenEntity.salesType = SaleTypes.OFFERS_ONLY
        tokenEntity.listPrice = ZERO_BIG_DECIMAL
        tokenEntity.lister = null
        tokenEntity.listingTimestamp = ZERO

        // Clear price listing
        store.remove("ListedToken", tokenId.toString());

        // Persist
        tokenEntity.save();

        // Token Events
        let tokenTransferEvent = createTokenTransferEvent(event, tokenId, from, to);
        tokenTransferEvent.save();

        // Update token offer owner
        if (to !== from) {
            updateTokenOfferOwner(event.block, tokenId, to)
        }

        /////////////////////
        // Handle transfer //
        /////////////////////

        recordTransfer(event, tokenEntity, editionEntity, to);
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
    log.info("KO V3 handleAdminArtistAccountReported() - disable account {}", [
        event.params._account.toHexString()
    ]);

    // FIXME finds all editions from the artist - disable them
}

export function handleAdminEditionReported(event: AdminEditionReported): void {
    log.info("KO V3 handleAdminEditionReported() - disable edition {}", [
        event.params._editionId.toString()
    ]);

    // find edition and disable
    let edition = loadNonNullableEdition(event.params._editionId)
    edition.active = false
    edition.save()
}

export function handleApprovalForAll(event: ApprovalForAll): void {
    log.info("KO V3 handleApprovalForAll() called - owner {} operator {} approved {}", [
        event.params.owner.toHexString(),
        event.params.operator.toHexString(),
        event.params.approved ? "TURE" : "FALSE",
    ]);

    let kodaV3Contract = KnownOriginV3.bind(event.address);

    // TODO handle mainnet

    // Primary Sale Marketplace V3 (rinkeby)
    if (event.params.operator.equals(Address.fromString(PRIMARY_SALE_RINKEBY))) {
        // clear the edition
        _setArtistEditionsNotForSale(event.block, event.params.owner, !event.params.approved, kodaV3Contract);

        // clear any tokens being sold from the owner
        _setCollectorTokensNotForSale(event.block, event.params.owner, !event.params.approved, kodaV3Contract);
    }

    // Second Sale Marketplace V3 (rinkeby)
    if (event.params.operator.equals(Address.fromString(SECONDARY_SALE_RINKEBY))) {
        // clear the edition
        _setArtistEditionsNotForSale(event.block, event.params.owner, !event.params.approved, kodaV3Contract);

        // clear any tokens being sold from the owner
        _setCollectorTokensNotForSale(event.block, event.params.owner, !event.params.approved, kodaV3Contract);
    }
}

export function handleApproval(event: Approval): void {

    // TODO handle mainnet

    // Primary Sale Marketplace V3 (rinkeby)
    if (event.params.approved.equals(Address.fromString(PRIMARY_SALE_RINKEBY))) {
        let token: Token | null = Token.load(event.params.tokenId.toString())
        if (token) {
            token.notForSale = false;
            token.save()
        }
    }

    // Second Sale Marketplace V3 (rinkeby)
    if (event.params.approved.equals(Address.fromString(SECONDARY_SALE_RINKEBY))) {
        let token: Token | null = Token.load(event.params.tokenId.toString())
        if (token) {
            token.notForSale = false;
            token.save()
        }
    }
}

function _setArtistEditionsNotForSale(block: ethereum.Block, artistAddress: Address, notForSale: boolean, kodaV3Contract: KnownOriginV3): void {
    let artist: Artist | null = Artist.load(artistAddress.toHexString())
    if (artist) {
        if (artist.isSet("editions")) {
            let editionIds = artist.editions
            for (let i = 0; i < editionIds.length; i++) {
                let editionId = editionIds[i];
                let edition = loadOrCreateV3Edition(BigInt.fromString(editionId), block, kodaV3Contract);
                edition.notForSale = notForSale
                edition.save()
            }
        }
    }
}

function _setCollectorTokensNotForSale(block: ethereum.Block, collectorAddress: Address, notForSale: boolean, kodaV3Contract: KnownOriginV3): void {
    let collector: Collector | null = Collector.load(collectorAddress.toHexString())
    if (collector) {
        if (collector.isSet("tokens")) {
            let tokensIds = collector.tokens
            for (let i = 0; i < tokensIds.length; i++) {
                let tokensId = tokensIds[i];
                let token = loadOrCreateV3Token(BigInt.fromString(tokensId), kodaV3Contract, block);
                token.notForSale = notForSale
                token.save()
            }
        }
    }
}
