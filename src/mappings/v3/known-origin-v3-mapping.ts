import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {Address, ethereum, log, store} from "@graphprotocol/graph-ts/index";
import {
    AdminArtistAccountReported,
    AdminEditionReported,
    AdminRoyaltiesRegistryProxySet,
    AdminTokenUriResolverSet,
    AdminUpdateSecondaryRoyalty,
    Approval,
    ApprovalForAll,
    ConsecutiveTransfer,
    KnownOriginV3,
    ReceivedChild,
    ReceivedERC20,
    Transfer,
    TransferChild,
    TransferERC20
} from "../../../generated/KnownOriginV3/KnownOriginV3";
import {Composable, ComposableItem, ListedToken, Token, Edition} from "../../../generated/schema";

import { DEAD_ADDRESS, isWETHAddress, ONE, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL } from "../../utils/constants";
import {
    PRIMARY_SALE_MAINNET,
    PRIMARY_SALE_RINKEBY,
    SECONDARY_SALE_MAINNET,
    SECONDARY_SALE_RINKEBY
} from "./KODAV3";

import * as platformConfig from "../../services/PlatformConfig.factory";
import * as offerService from "../../services/Offers.service";
import * as tokenService from "../../services/Token.service";
import * as tokenEventFactory from "../../services/TokenEvent.factory";
import * as transferEventFactory from "../../services/TransferEvent.factory";
import * as collectorService from "../../services/Collector.service";
import * as activityEventService from "../../services/ActivityEvent.service";
import * as artistService from "../../services/Artist.service";
import * as approvalService from "../../services/Approval.service";
import * as dayService from "../../services/Day.service";
import * as editionService from "../../services/Edition.service";
import * as composableService from "../../services/Composables.service";
import * as KodaVersions from "../../utils/KodaVersions";
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
    // Note: we dont create the token here - only on first transfer do we create a Token entity
    if (from.equals(ZERO_ADDRESS)) {

        // create edition
        let editionEntity = editionService.loadOrCreateV3EditionFromTokenId(tokenId, event.block, kodaV3Contract);
        editionEntity.save()

        // We only need to record the edition being created once
        if (BigInt.fromString(editionEntity.editionNmber).equals(tokenId)) {
            dayService.addEditionToDay(event, editionEntity.id);

            let creator = kodaV3Contract.getCreatorOfToken(tokenId);
            let artist = artistService.addEditionToArtist(creator, editionEntity.editionNmber, editionEntity.totalAvailable, event.block.timestamp)

            activityEventService.recordEditionCreated(event, editionEntity)

            // Only the first edition is classed as a Genesis edition
            let maybeEdition = Edition.load(artist.firstEdition as string);
            editionEntity.isGenesisEdition = maybeEdition != null
              ? BigInt.fromString(editionEntity.editionNmber).equals(BigInt.fromString(maybeEdition.editionNmber))
              : false

            editionEntity.save()
        }
    } else {
        ////////////////
        // Day Counts //
        ////////////////

        dayService.recordDayTransfer(event);

        /////////////////////
        // Collector Logic //
        /////////////////////

        // add tokens to collector
        let collector = collectorService.addTokenToCollector(to, event.block, tokenId.toString());
        collector.save();

        // remove tokens from collector
        collectorService.removeTokenFromCollector(from, event.block, tokenId.toString());

        /////////////////
        // Token Logic //
        /////////////////

        // Token - save it so down stream things can use the token relationship
        let tokenEntity = tokenService.loadOrCreateV3Token(tokenId, kodaV3Contract, event.block)
        tokenEntity.save();

        // Load it again
        tokenEntity = tokenService.loadOrCreateV3Token(tokenId, kodaV3Contract, event.block)

        // Ensure approval for token ID is cleared
        let approved = kodaV3Contract.getApproved(tokenId);
        if (!approved.equals(ZERO_ADDRESS)) {
            tokenEntity.revokedApproval = false;
        }

        ///////////////
        // Transfers //
        ///////////////

        // Edition Logic

        // Record transfer against the edition
        let editionEntity = editionService.loadOrCreateV3Edition(BigInt.fromString(tokenEntity.editionNumber), event.block, kodaV3Contract);

        // Transfer Events
        let transferEvent = transferEventFactory.createTransferEvent(event, tokenId, from, to, editionEntity);
        transferEvent.save();

        // Set Transfers on edition
        let editionTransfers = editionEntity.transfers;
        editionTransfers.push(transferEvent.id);
        editionEntity.transfers = editionTransfers;

        // @ts-ignore
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

        // Maintain a list of tokenId issued from the edition
        let tokenIds = editionEntity.tokenIds
        let foundTokenId = false;
        for (let i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenId.toString()) {
                foundTokenId = true;
            }
        }

        // if we dont know about this token, add it to the list
        if (!foundTokenId) tokenIds.push(tokenId.toString())
        editionEntity.tokenIds = tokenIds

        let maxSize = kodaV3Contract.getSizeOfEdition(BigInt.fromString(editionEntity.editionNmber));

        // Reduce remaining supply for each mint -
        editionEntity.remainingSupply = maxSize.minus(BigInt.fromI32(tokenIds.length))

        // if the edition is in a state reserve sale, has an active bid and is now sold out
        if (editionEntity.salesType.equals(SaleTypes.RESERVE_COUNTDOWN_AUCTION)
            && editionEntity.activeBid !== null
            && editionEntity.remainingSupply === ZERO) {

            // if the current bidder is not the person who received the token, assume the seller has transferred  if after receiving a bid
            if (editionEntity.reserveAuctionBidder.toHexString() !== to.toHexString()) {
                editionEntity.reserveAuctionCanEmergencyExit = true
                editionEntity.activeBid = null;
                log.warning("Force withdrawal triggerred for primary sale edition {} | bidder {} | seller {} | new owner {}", [
                    editionEntity.id.toString(),
                    editionEntity.reserveAuctionBidder.toHexString(),
                    from.toHexString(),
                    to.toHexString(),
                ]);
            }
        }

        editionEntity.save();

        ////////////////////
        // Set token data //
        ////////////////////

        // set birth of the token to when the edition was created as we dont add subgraph token data until this event
        if (tokenEntity.birthTimestamp.equals(ZERO)) {
            tokenEntity.birthTimestamp = event.block.timestamp
        }

        // Record transfer against token
        let tokenTransfers = tokenEntity.transfers;
        // @ts-ignore
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

        // This is set when an active reserve auction does not complete and the seller transfer it to another wallet during this process
        let triggerredForceWithdrawalFrom = false;

        // if the token is in a state reserve sale, has an active bid
        if (tokenEntity.salesType.equals(SaleTypes.RESERVE_COUNTDOWN_AUCTION) && tokenEntity.isListed && tokenEntity.listing !== null) {

            // log.warning("Possible forced token withdrawal tokenID {} from {} to {} salesType {} isListed {}", [
            //     tokenId.toString(),
            //     from.toHexString(),
            //     to.toHexString(),
            //     tokenEntity.salesType.toString(),
            //     tokenEntity.isListed ? 'TRUE' : 'FALSE'
            // ]);

            if(tokenEntity.listing) {
                let listing = store.get("ListedToken", tokenEntity.listing as string) as ListedToken;

                // Is the list still exists this means the bid was not action but the seller transfer the token before completion of the action
                if (listing !== null) {

                    // Disable listing
                    tokenEntity.isListed = false;

                    // Set flag to signify force withdrawal possible
                    listing.reserveAuctionCanEmergencyExit = true
                    listing.save()

                    triggerredForceWithdrawalFrom = true;

                    log.warning("Force withdrawal triggerred for token {} | bidder {} | seller {} | new owner {}", [
                        tokenId.toString(),
                        listing.reserveAuctionBidder.toHexString(),
                        from.toHexString(),
                        to.toHexString(),
                    ]);
                }
            }
        }

        if (!triggerredForceWithdrawalFrom) {

            // Clear token price listing fields
            tokenEntity.isListed = false;
            tokenEntity.salesType = SaleTypes.OFFERS_ONLY
            tokenEntity.listPrice = ZERO_BIG_DECIMAL
            tokenEntity.lister = null
            tokenEntity.listingTimestamp = ZERO
            tokenEntity.openOffer = null
            tokenEntity.currentTopBidder = null

            let listedToken = store.get("ListedToken", tokenId.toString());
            if(listedToken) {
                // Clear price listing
                store.remove("ListedToken", tokenId.toString());
            }
        }

        // Persist
        tokenEntity.save();

        // Token Events
        let tokenTransferEvent = tokenEventFactory.createTokenTransferEvent(event, tokenId.toString(), from, to);
        tokenTransferEvent.save();

        // Update token offer owner
        if (to !== from) {
            offerService.updateTokenOfferOwner(event.block, tokenId, to)
        }

        /////////////////////
        // Handle transfer //
        /////////////////////

        let transferValue = event.transaction.value;

        // If we see a msg.value record it as a sale
        if (event.transaction.value.gt(ZERO)) {
            const primarySale = tokenEntity.transferCount.equals(BigInt.fromI32(1));
            tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, event.transaction.value, primarySale);
            tokenEntity.save();
        } else {
            // Attempt to handle WETH trades found during the trade (Note: this is not handle bundled transfers)
            let receipt = event.receipt;
            if(receipt && receipt.logs.length > 0) {
                let eventLogs = receipt.logs;
                for (let index = 0; index < eventLogs.length; index++) {
                    let eventLog = eventLogs[index];
                    let eventAddress = eventLog.address.toHexString();
                    if (isWETHAddress(eventAddress)) {
                        let wethTradeValue = BigInt.fromUnsignedBytes(Bytes.fromUint8Array(eventLog.data.reverse()));
                        transferValue = wethTradeValue;

                        let primarySale = tokenEntity.transferCount.equals(BigInt.fromI32(1));
                        tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, wethTradeValue, primarySale);
                        tokenEntity.save();
                        break;
                    }
                }
            }
        }

        activityEventService.recordTransfer(event, tokenEntity, editionEntity, to, from, transferValue);

        //////////////////////////////////////////////////////////////////////////////////
        // Everytime a transfer is made we work out burns, mints, available, unsold etc //
        //////////////////////////////////////////////////////////////////////////////////

        // work out how many have been burnt vs issued
        let totalBurnt = 0;
        for (let i = 0; i < tokenIds.length; i++) {
            let tokenId = tokenIds[i as i32];
            let token = Token.load(tokenId.toString());
            if (token) {
                const currentOwner = token.currentOwner;
                if(currentOwner) {
                    const tokenOwner = Address.fromString(currentOwner);

                    // Either zero address or dead address we classify  as burns
                    if (tokenOwner.equals(DEAD_ADDRESS) || tokenOwner.equals(ZERO_ADDRESS)) {
                        // record total burnt tokens
                        totalBurnt = totalBurnt + 1
                    }
                }
            }
        }

        // total supply is the total tokens issued minus the burns
        editionEntity.totalSupply = BigInt.fromI32(tokenIds.length).minus(BigInt.fromI32(totalBurnt))

        // track the total burns on the edition
        editionEntity.totalBurnt = BigInt.fromI32(totalBurnt)

        // keep these in sync = total supply = edition size & total available = edition size
        editionEntity.totalAvailable = editionEntity.originalEditionSize.minus(BigInt.fromI32(totalBurnt))

        // total remaining primary sales - original edition size minus tokens issued
        //                                 a new token ID is created on ever 'first transfer' up to edition size
        let originalSize = kodaV3Contract.getSizeOfEdition(BigInt.fromString(editionEntity.editionNmber))
        editionEntity.remainingSupply = originalSize.minus(BigInt.fromI32(tokenIds.length))

        // If total burnt is original size then disable the edition
        if (editionEntity.totalBurnt.equals(editionEntity.originalEditionSize)) {

            // reduce supply of artist if edition is completely removed
            let artist = artistService.loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
            artist.supply = artist.supply.minus(BigInt.fromI32(totalBurnt));
            artist.editionsCount = artist.editionsCount.minus(ONE);
            artist.save()

            // Set edition as disable as the entity has been removed
            editionEntity.active = false;
        }

        editionEntity.save()
    }
}

export function handleAdminRoyaltiesRegistryProxySet(event: AdminRoyaltiesRegistryProxySet): void {
    let marketConfig = platformConfig.getPlatformConfig()
    marketConfig.royaltiesRegistry = event.params._royaltiesRegistryProxy;
    marketConfig.save();
}

export function handleAdminTokenUriResolverSet(event: AdminTokenUriResolverSet): void {
    let marketConfig = platformConfig.getPlatformConfig()
    marketConfig.tokenUriResolver = event.params._tokenUriResolver;
    marketConfig.save();
}

export function handleAdminUpdateSecondaryRoyalty(event: AdminUpdateSecondaryRoyalty): void {
    let marketConfig = platformConfig.getPlatformConfig()
    marketConfig.secondarySaleRoyalty = event.params._secondarySaleRoyalty;
    marketConfig.save();
}

export function handleAdminArtistAccountReported(event: AdminArtistAccountReported): void {
    log.info("KO V3 handleAdminArtistAccountReported() - disable account {}", [
        event.params._account.toHexString()
    ]);

    // TODO disable for now
    // Set editions to inactive
    // let artist = artistService.loadOrCreateArtist(event.params._account)
    // let editions = artist.editions;
    // for (let i = 0; i < editions.length; i++) {
    //     let editionsId = editions[i];
    //     let edition = editionService.loadNonNullableEdition(BigInt.fromString(editionsId));
    //     if (edition !== null && edition.version.equals(KodaVersions.KODA_V3)) {
    //         edition.active = false
    //         edition.save()
    //         activityEventService.recordEditionDisabled(event, edition);
    //     }
    // }
    // artist.save()
}

export function handleAdminEditionReported(event: AdminEditionReported): void {
    log.info("KO V3 handleAdminEditionReported() - disable edition {}", [
        event.params._editionId.toString()
    ]);

    // find edition and disable
    let edition = editionService.loadNonNullableEdition(event.params._editionId.toString())
    edition.active = false
    edition.save()

    activityEventService.recordEditionDisabled(event, edition);
}

export function handleApprovalForAll(event: ApprovalForAll): void {
    log.info("KO V3 handleApprovalForAll() called - owner {} operator {} approved {}", [
        event.params.owner.toHexString(),
        event.params.operator.toHexString(),
        event.params.approved ? "TURE" : "FALSE",
    ]);

    // Primary & Secondary Sale Marketplace V3 (mainnet)
    if (event.params.operator.equals(Address.fromString(PRIMARY_SALE_MAINNET))
        || event.params.operator.equals(Address.fromString(PRIMARY_SALE_RINKEBY))) {
        log.debug("KO V3 handleApprovalForAll() handling edition approvals for owner {}", [
            event.params.owner.toHexString(),
        ]);
        approvalService.handleArtistEditionsApprovalChanged(event.block, event.params.owner, event.params.approved, KodaVersions.KODA_V3);
    }

    // clear any tokens being sold from the owner
    if (event.params.operator.equals(Address.fromString(SECONDARY_SALE_MAINNET))
        || event.params.operator.equals(Address.fromString(SECONDARY_SALE_RINKEBY))) {
        log.debug("KO V3 handleApprovalForAll() handling token approvals for owner {}", [
            event.params.owner.toHexString(),
        ]);
        approvalService.handleCollectorTokensApprovalChanged(event.block, event.params.owner, event.params.approved, KodaVersions.KODA_V3);
    }
}

export function handleApproval(event: Approval): void {
    log.info("KO V3 handleApproval() called - owner {} token {} approved {}", [
        event.params.owner.toHexString(),
        event.params.tokenId.toString(),
        event.params.approved ? "TRUE" : "FALSE",
    ]);
    // Secondary Sale Marketplace V3 (rinkeby & mainnet)
    if (event.params.approved.equals(Address.fromString(SECONDARY_SALE_MAINNET))
        || event.params.approved.equals(Address.fromString(SECONDARY_SALE_RINKEBY))) {
        log.debug("KO V3 handleApproval() handling token approvals for owner {}", [
            event.params.owner.toHexString(),
        ]);
        approvalService.handleSingleApproval(event.params.tokenId, event.params.owner, event.params.approved, KodaVersions.KODA_V3);
    }
}

// handleReceivedERC20 handles the ReceivedERC20 event fired by the getERC20 function
export function handleReceivedERC20(event: ReceivedERC20): void {
    log.info("KO V3 - handleReceivedERC20() called : from {} tokenID {} erc20Contract {} value {}", [
        event.params._from.toHexString(),
        event.params._tokenId.toString(),
        event.params._erc20Contract.toHexString(),
        event.params._value.toString(),
    ]);

    // Strip off the composableID
    const compID: string = event.params._tokenId.toString()

    // Try and load the composable
    let composable: Composable | null = Composable.load(compID)

    // If composable doesn't exist then create it and its items array
    if (!composable) {
        composable = new Composable(compID)
        composable.items = new Array<string>()
    }

    // Save the composable
    composable.save()

    // Construct the itemID by combining the tokenId and contract address
    let itemID: string = _erc20ComposableItemId(event.params._tokenId, event.params._erc20Contract)

    // Try and load the composable item
    let item: ComposableItem | null = ComposableItem.load(itemID)

    // If the item doesn't exist then create it and assign its properties
    if (!item) {
        item = new ComposableItem(itemID)
        item.address = event.params._erc20Contract.toHexString()
        item.tokenID = event.params._tokenId.toString()
        item.type = 'ERC20'
        item.value = event.params._value
    } else {
        // Otherwise just up the value of the item
        item.value = item.value.plus(event.params._value)
    }

    // Save the item
    item.save()

    // Strip off the items from the composable, push the new item to it and re-assign
    let items = composable.items;
    if(!items) items = new Array<string>();
    items.push(item.id.toString());
    composable.items = items;
    composable.save()

    // flag edition as enhanced
    let koda = KnownOriginV3.bind(event.address);
    let edition = editionService.loadNonNullableEdition(koda.getEditionIdOfToken(event.params._tokenId).toString())
    edition.isEnhancedEdition = true
    edition.save()

    // Record activity event
    activityEventService.recordComposableAdded(event, edition)
}

// handleTransferERC20 handles the TransferERC20 event fired by the transferERC20 function
export function handleTransferERC20(event: TransferERC20): void {
    log.info("KO V3 - handleTransferERC20() called : to {} tokenID {} erc20Contract {} value {}", [
        event.params._to.toHexString(),
        event.params._tokenId.toString(),
        event.params._erc20Contract.toHexString(),
        event.params._value.toString(),
    ]);

    // Construct the itemID by combining the tokenId and contract address
    let itemID: string = _erc20ComposableItemId(event.params._tokenId, event.params._erc20Contract)

    // Try and load the composable item, throwing an error if it doesn't exist
    let item: ComposableItem | null = ComposableItem.load(itemID)
    if (!item) {
        log.error("Unable to find composable item under id {}", [itemID])
        return
    }

    // Take the value away from the items value
    item.value = item.value.minus(event.params._value)

    // If the value is 0 then delete the item, otherwise just save it
    if (item.value.isZero()) {
        store.remove('ComposableItem', itemID)
    } else {
        item.save()
    }

    // flag edition as enhanced
    let koda = KnownOriginV3.bind(event.address);
    let edition = editionService.loadNonNullableEdition(koda.getEditionIdOfToken(event.params._tokenId).toString())
    edition.isEnhancedEdition = composableService.determineIfEditionIsEnhanced(koda, event.params._tokenId);
    edition.save()

    // Record activity event
    activityEventService.recordComposableClaimed(event, edition)
}

export function handleReceivedERC721(event: ReceivedChild): void {
    log.info("KO V3 - handleReceivedERC721() called : from {} tokenID {} 721 Contract {} composed token ID {}", [
        event.params._from.toHexString(),
        event.params._tokenId.toString(),
        event.params._childContract.toHexString(),
        event.params._childTokenId.toString(),
    ]);

    // Strip off the composableID
    const compID: string = event.params._tokenId.toString()

    // Try and load the composable
    let composable: Composable | null = Composable.load(compID)

    // If composable doesn't exist then create it and its items array
    if (!composable) {
        composable = new Composable(compID)
        composable.items = new Array<string>()
    }

    // Save the composable
    composable.save()

    // Construct the itemID by combining the tokenId, contract and child tokenId
    let itemID: string = _erc721ComposableItemId(event.params._tokenId, event.params._childContract, event.params._childTokenId)

    // Try and load the composable item
    let item: ComposableItem | null = ComposableItem.load(itemID)

    // If the item doesn't exist then create it and assign its properties
    item = new ComposableItem(itemID)
    item.address = event.params._childContract.toHexString()
    item.tokenID = event.params._tokenId.toString()
    item.type = 'ERC721'
    item.value = event.params._childTokenId

    // Save the item
    item.save()

    // Strip off the items from the composable, push the new item to it and re-assign
    let items = composable.items;
    if(!items) items = new Array<string>();
    items.push(item.id.toString());
    composable.items = items;
    composable.save()

    // flag edition as enhanced
    let koda = KnownOriginV3.bind(event.address);
    let edition = editionService.loadNonNullableEdition(koda.getEditionIdOfToken(event.params._tokenId).toString())
    edition.isEnhancedEdition = true;
    edition.save()

    // Record activity event
    activityEventService.recordComposableAdded(event, edition)
}

export function handleTransferERC721(event: TransferChild): void {
    log.info("KO V3 handleTransferERC721 - _childContract() called : to {} tokenID {} child contract {} child token ID {}", [
        event.params._to.toHexString(),
        event.params._tokenId.toString(),
        event.params._childContract.toHexString(),
        event.params._childTokenId.toString(),
    ]);

    // Construct the itemID by combining the tokenId and contract address
    let itemID: string = _erc721ComposableItemId(event.params._tokenId, event.params._childContract, event.params._childTokenId);

    // Try and load the composable item, throwing an error if it doesn't exist
    let item: ComposableItem | null = ComposableItem.load(itemID)
    if (!item) {
        log.error("Unable to find composable  item under id {}", [itemID])
        return
    }

    store.remove('ComposableItem', itemID)

    // flag edition as enhanced
    let koda = KnownOriginV3.bind(event.address);
    let edition = editionService.loadNonNullableEdition(koda.getEditionIdOfToken(event.params._tokenId).toString())
    edition.isEnhancedEdition = composableService.determineIfEditionIsEnhanced(koda, event.params._tokenId);
    edition.save()

    // Record activity event
    activityEventService.recordComposableClaimed(event, edition)
}

function _erc20ComposableItemId(_tokenId: BigInt, _erc20Contract: Address): string {
    // Construct the itemID by combining the tokenId and contract address
    return _tokenId.toString()
        .concat("/")
        .concat(_erc20Contract.toHexString())
}

function _erc721ComposableItemId(_tokenId: BigInt, _childContract: Address, _childTokenId: BigInt): string {
    // Construct the itemID by combining the tokenId, contract and child tokenId
    return _tokenId.toString()
        .concat("/")
        .concat(_childContract.toHexString())
        .concat("/")
        .concat(_childTokenId.toHexString())
}
