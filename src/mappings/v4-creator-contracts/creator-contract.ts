import {Address, BigDecimal, BigInt, Bytes, log, store} from "@graphprotocol/graph-ts";

import {
    Paused,
    Unpaused,
    OwnershipTransferred,
    Transfer,
    DefaultRoyaltyPercentageUpdated,
    EditionRoyaltyPercentageUpdated,

    ListedEditionForBuyNow,
    BuyNowDeListed,
    BuyNowPriceChanged,
    BuyNowPurchased,

    EditionFundsHandlerUpdated,
    EditionSalesDisabledUpdated,
    EditionURIUpdated,

    ListedTokenForBuyNow,
    BuyNowTokenDeListed,
    BuyNowTokenPriceChanged,
    BuyNowTokenPurchased,
    ERC721KODACreatorWithBuyItNow as ERC721CreatorContract
} from "../../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";

import {
    FundsHandler
} from "../../../generated/KnownOriginV4Factory/FundsHandler";

import {
    CreatorContract,
    Edition,
    Collective,
    CreatorContractSetting,
    Token,
} from "../../../generated/schema"

import {
    loadOrCreateV4Edition,
    loadOrCreateV4EditionFromTokenId,
    populateEditionMetadata
} from "../../services/Edition.service";

import {
    addEditionToDay,
    recordDayCounts,
    recordDayIssued,
    recordDayTransfer,
    recordDayValue
} from "../../services/Day.service";

import * as SaleTypes from "../../utils/SaleTypes";
import * as tokenEventFactory from "../../services/TokenEvent.factory";
import * as transferEventFactory from "../../services/TransferEvent.factory";
import * as activityEventService from "../../services/ActivityEvent.service";
import {
    addTokenToCollector,
    removeTokenFromCollector,
    collectorInList
} from "../../services/Collector.service";
import {loadOrCreateV4Token} from "../../services/Token.service";
import * as EVENT_TYPES from "../../utils/EventTypes";
import {addEditionToArtist, recordArtistValue, loadOrCreateArtist} from "../../services/Artist.service";
import {loadOrCreateListedToken} from "../../services/ListedToken.service";
import {findWETHTradeValue, toEther} from "../../utils/utils";
import {DEAD_ADDRESS, isWETHAddress, ONE, ONE_ETH, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../../utils/constants";
import {createV4Id} from "./KODAV4"
import * as tokenService from "../../services/Token.service";
import { KODA_V4 } from "../../utils/KodaVersions";

export function handleEditionSalesDisabledUpdated(event: EditionSalesDisabledUpdated): void {
    let creatorContractInstance = ERC721CreatorContract.bind(event.address)

    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let editionEntity = loadOrCreateV4Edition(event.params._editionId, event.block, event.address, contractEntity.isHidden);
    editionEntity.isOpenEdition = creatorContractInstance.isOpenEdition(BigInt.fromString(editionEntity.editionNmber));

    if (editionEntity.isOpenEdition) {
        editionEntity.endDate = event.block.timestamp;
        editionEntity.totalAvailable = editionEntity.totalSupply;
        editionEntity.remainingSupply = ZERO;
    }

    // Disable edition if no sales/transfers have happened
    if(event.params._disabled && editionEntity.totalSupply.equals(ZERO)) {
        editionEntity.active = false;
        let artist = loadOrCreateArtist(Address.fromString(editionEntity.artistAccount.toHexString()));
        artist.editionsCount = artist.editionsCount.minus(ONE);
        artist.ccEditionsCount = artist.ccEditionsCount.minus(ONE);
    }
    editionEntity.save()

    activityEventService.recordCCEditionSalesDisabledUpdated(
        event.address.toHexString(),
        editionEntity.id,
        event,
        editionEntity
    );
}

export function handleEditionURIUpdated(event: EditionURIUpdated): void {
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let editionEntity = loadOrCreateV4Edition(event.params._editionId, event.block, event.address, contractEntity.isHidden);

    let creatorContractInstance = ERC721CreatorContract.bind(event.address)
    populateEditionMetadata(
        editionEntity,
        editionEntity.id,
        creatorContractInstance.editionURI(event.params._editionId)
    )

    editionEntity.save()

    activityEventService.recordCCEditionURIUpdated(
        event.address.toHexString(),
        editionEntity.id,
        event,
        editionEntity
    );
}

export function handlePaused(event: Paused): void {
    let entity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    entity.paused = true;
    entity.save();

    activityEventService.recordCCContractPauseToggle(
        event.address.toHexString(),
        event.address.toHexString(),
        event,
        true
    );
}

export function handleUnpaused(event: Unpaused): void {
    let entity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    entity.paused = false;
    entity.save();

    activityEventService.recordCCContractPauseToggle(
        event.address.toHexString(),
        event.address.toHexString(),
        event,
        true
    );
}

export function handleTransfer(event: Transfer): void {
    log.info("Calling handleTransfer() call for V4 contract address: [{}] id: [{}] ", [
        event.address.toHexString(),
        event.params.tokenId.toString()
    ]);

    // Extract params for processing
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let creatorContractInstance = ERC721CreatorContract.bind(event.address)
    let editionId = creatorContractInstance.tokenEditionId(event.params.tokenId)
    let isNewEdition = Edition.load(createV4Id(event.address.toHexString(), editionId.toString())) == null

    // If the edition has never been seen before, it will be created
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params.tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    // Check whether we're looking at an open edition
    edition.isOpenEdition = creatorContractInstance.isOpenEdition(BigInt.fromString(edition.editionNmber));

    // Determine if default contract owner is the creator or if a creator override has been set
    let owner = creatorContractInstance.owner()
    let editionCreator = creatorContractInstance.tokenEditionCreator(event.params.tokenId)
    let creator = editionCreator.equals(ZERO_ADDRESS) ? owner : editionCreator;

    /////////////////////
    // Transfer Event ///
    /////////////////////

    // Process transfer events and record them in various places
    let tEvent = transferEventFactory.createTransferEvent(event, event.params.tokenId, creator, event.params.to, edition)
    tEvent.save()

    // If the edition is new, lets record its creation
    if (event.params.from.equals(ZERO_ADDRESS) && isNewEdition) {
        // Day counts
        addEditionToDay(event, edition.id);

        // Activity events
        activityEventService.recordEditionCreated(event, edition);

        // Creator contract counts
        contractEntity.totalNumOfEditions = contractEntity.totalNumOfEditions.plus(ONE);

        let editions = contractEntity.editions;
        editions.push(edition.id);
        contractEntity.editions = editions;

        // Artist
        addEditionToArtist(creator, edition.id, edition.totalAvailable, event.block.timestamp, KODA_V4)
    }

    // When we have an open edition from zero address i.e. a primary mint/purchase
    if (event.params.from.equals(ZERO_ADDRESS) && edition.isOpenEdition) {
        edition.totalSupply = edition.totalSupply.plus(ONE);
    }

    // Handle the rest of the non burn specific logic

    //////////////////////////////////////////
    // Transfers outside of the marketplace //
    //////////////////////////////////////////

    // const isBurntDeadAddress = event.params.to.equals(DEAD_ADDRESS);
    // const isBurntZeroAddress = event.params.to.equals(ZERO_ADDRESS);
    // const isGiftedToCreator = event.params.to.equals(creator);
    const isBirthToken = event.params.from.equals(ZERO_ADDRESS);

    // Check if we're dealing with an open edition token (doesn't already exist) and if it's a first transfer
    let isNewOpenEditionToken = false;
    if (edition.isOpenEdition) {
        isNewOpenEditionToken = Token.load(createV4Id(event.address.toHexString(), event.params.tokenId.toString())) == null
    }

    // If the token is being sold/gifted outside of marketplace (it is not being minted from zero to the edition creator)
    if (!isBirthToken || isNewOpenEditionToken) {
        let tokenEntity = loadOrCreateV4Token(event.params.tokenId, event.address, creatorContractInstance, edition, event.block);
        tokenEntity.currentOwner = event.params.to.toString()
        tokenEntity.salesType = SaleTypes.OFFERS_ONLY

        // Update counters and timestamps
        tokenEntity.lastTransferTimestamp = event.block.timestamp
        tokenEntity.transferCount = tokenEntity.transferCount.plus(ONE)

        tokenEntity.save()

        /////////////////
        // Collectors //
        ////////////////
        // add tokens to collector
        let collector = addTokenToCollector(event.params.to, event.block, tokenEntity.id);

        // remove tokens from collector
        removeTokenFromCollector(event.params.from, event.block, tokenEntity.id);

        // Check if the edition already has the owner
        if (!collectorInList(collector, edition.allOwners)) {
            let allOwners = edition.allOwners;
            allOwners.push(collector.id);
            edition.allOwners = allOwners;
        }

        // Tally up current owners of edition
        if (!collectorInList(collector, edition.currentOwners)) {
            let currentOwners = edition.currentOwners;
            currentOwners.push(collector.id);
            edition.currentOwners = currentOwners;
        }

        // Do the same for the token owner
        if (!collectorInList(collector, tokenEntity.allOwners)) {
            let allOwners = tokenEntity.allOwners;
            allOwners.push(collector.id);
            tokenEntity.allOwners = allOwners;
        }

        /////////////////////
        // Token Handling ///
        /////////////////////
        // Handle the token entity and token arrays on the edition

        // Maintain a list of tokenId issued from the edition
        let tokenIds = edition.tokenIds
        let foundTokenId = false;
        for (let i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == tokenEntity.id) {
                foundTokenId = true;
            }
        }

        // if we don't know about this token, add it to the list
        if (!foundTokenId) tokenIds.push(tokenEntity.id)
        edition.tokenIds = tokenIds

        // Set the token current owner
        tokenEntity.currentOwner = collector.id;

        // Set Transfers on edition
        let editionTransfers = edition.transfers;
        editionTransfers.push(tEvent.id);
        edition.transfers = editionTransfers;

        // Set transfer on token
        let tokenTransfers = tokenEntity.transfers;
        tokenTransfers.push(tEvent.id);
        tokenEntity.transfers = tokenTransfers;

        tokenEntity.editionActive = contractEntity.isHidden
        tokenEntity.artistAccount = creator
        // Save the token entity
        tokenEntity.save()

        // Record day stats
        recordDayTransfer(event);
        recordDayIssued(event, event.params.tokenId);

        // Record total number of transfers at the contract level
        contractEntity.totalNumOfTransfers = contractEntity.totalNumOfTransfers.plus(ONE);

        // Token Events
        let tokenTransferEvent = tokenEventFactory.createTokenTransferEvent(event, tokenEntity.id, event.params.from, event.params.to);
        tokenTransferEvent.save();

        let transferValue = event.transaction.value;

        // If we see a msg.value record it as a sale
        if (event.transaction.value.gt(ZERO)) {
            const primarySale = tokenEntity.transferCount.equals(BigInt.fromI32(1));
            tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, event.transaction.value, primarySale);
            tokenEntity.save();
        } else {
            // Attempt to handle WETH trades found during the trade (Note: this is not handle bundled transfers)
            transferValue = findWETHTradeValue(event);
            if (transferValue) {
                let primarySale = tokenEntity.transferCount.equals(BigInt.fromI32(1));
                tokenEntity = tokenService.recordTokenSaleMetrics(tokenEntity, transferValue, primarySale);
                tokenEntity.save();
            }
        }

        activityEventService.recordTransfer(event, tokenEntity, edition, event.params.from, event.params.to, transferValue);
    }

    /////////////////////////////////////////////////////
    // Handle counting tokens from each transfer event //
    /////////////////////////////////////////////////////

    let tokenIds = edition.tokenIds

    // work out how many have been burnt vs issued
    // @ts-ignore
    let totalBurnt: i32 = 0;
    // @ts-ignore
    for (let i: i32 = 0; i < tokenIds.length; i++) {
        let token = Token.load(tokenIds[i].toString())
        if (token) {
            const tokenOwner = Address.fromString(token.currentOwner as string);
            // Either zero address or dead address we classify  as burns
            if (tokenOwner.equals(DEAD_ADDRESS) || tokenOwner.equals(ZERO_ADDRESS)) {
                // record total burnt tokens
                totalBurnt = totalBurnt + 1
            }
        }
    }

    // total supply is the total tokens issued minus the burns
    edition.totalSupply = BigInt.fromI32(edition.tokenIds.length).minus(BigInt.fromI32(totalBurnt))

    // track the total burns on the edition
    edition.totalBurnt = BigInt.fromI32(totalBurnt)

    // keep these in sync = total supply = edition size & total available = edition size
    edition.totalAvailable = edition.originalEditionSize.minus(BigInt.fromI32(totalBurnt))

    // update the remaining supply based on original size minus issued supply
    edition.remainingSupply = edition.totalAvailable.minus(edition.totalSupply)

    ///////////
    // Burns //
    ///////////

    // If total burnt is original size then disable the edition
    if (edition.totalBurnt.equals(edition.originalEditionSize)) {

        // reduce supply of artist if edition is completely removed
        let artist = loadOrCreateArtist(Address.fromString(edition.artistAccount.toHexString()));
        artist.supply = artist.supply.minus(edition.totalBurnt);
        artist.editionsCount = artist.editionsCount.minus(ONE);
        artist.ccEditionsCount = artist.ccEditionsCount.minus(ONE);
        artist.save()

        // Set edition as disable as the entity has been removed
        edition.active = false;
    }

    // Save entities at once
    edition.save();
    contractEntity.save();
}

export function handleListedForBuyItNow(event: ListedEditionForBuyNow): void {
    log.info("Calling handleListedForBuyItNow() call for contract {} ", [event.address.toHexString()]);

    let creatorContractInstance = ERC721CreatorContract.bind(event.address)
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract;
    let edition = loadOrCreateV4Edition(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    );

    const editionListing = creatorContractInstance.editionListing(BigInt.fromString(edition.editionNmber))

    // Check whether we're looking at an open edition
    edition.isOpenEdition = creatorContractInstance.isOpenEdition(BigInt.fromString(edition.editionNmber));
    edition.startDate = event.params._startDate;
    edition.endDate = editionListing.value2
    edition.priceInWei = event.params._price;
    edition.salesType = edition.isOpenEdition ? SaleTypes.OPEN_EDITION_BUY_NOW : SaleTypes.BUY_NOW;

    edition.save();

    // If we're on an open edition we need to add to the contractEntity here as won't have transfer event
    if (edition.isOpenEdition) {
        let editions = contractEntity.editions
        editions.push(edition.id)
        contractEntity.editions = editions
        contractEntity.save()

        // Activity events
        activityEventService.recordEditionCreated(event, edition);

        // Add Open Edition to Artist
        let artist = Address.fromString(edition.artistAccount.toHexString());
        addEditionToArtist(artist, edition.id, edition.totalAvailable, event.block.timestamp, KODA_V4)
    }

    activityEventService.recordCCListedEditionForBuyNow(
        event.address.toHexString(),
        edition.id,
        event,
        edition
    );
}

export function handleBuyNowDeListed(event: BuyNowDeListed): void {
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    edition.startDate = ZERO
    edition.priceInWei = ZERO
    edition.salesType = SaleTypes.OFFERS_ONLY // Revert back to the default state during de-listing

    edition.save()

    activityEventService.recordCCBuyNowDeListed(
        event.address.toHexString(),
        edition.id,
        event,
        edition
    )
}

export function handleBuyNowPriceChanged(event: BuyNowPriceChanged): void {
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    )
    edition.priceInWei = event.params._price
    edition.save()

    activityEventService.recordPriceChanged(event, edition, event.params._price);

    activityEventService.recordCCBuyNowPriceChanged(
        event.address.toHexString(),
        edition.id,
        event,
        edition
    );
}

export function handleBuyNowPurchased(event: BuyNowPurchased): void {
    // Update creator contract stats
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    contractEntity.totalNumOfTokensSold = contractEntity.totalNumOfTokensSold.plus(ONE)
    contractEntity.totalEthValueOfSales = contractEntity.totalEthValueOfSales.plus(BigDecimal.fromString(event.params._price.toString()).div(ONE_ETH))
    contractEntity.save()

    // Load and update edition stats
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    let creatorContractInstance = ERC721CreatorContract.bind(event.address)
    let owner = creatorContractInstance.owner()
    let editionCreator = creatorContractInstance.tokenEditionCreator(BigInt.fromString(edition.editionNmber))

    // Update token sale stats
    let tokenEntity = loadOrCreateV4Token(event.params._tokenId, event.address, creatorContractInstance, edition, event.block);
    tokenEntity.primaryValueInEth = BigDecimal.fromString(event.params._price.toString()).div(ONE_ETH)
    tokenEntity.totalPurchaseValue = BigDecimal.fromString(event.params._price.toString()).div(ONE_ETH)
    tokenEntity.totalPurchaseCount = ONE
    tokenEntity.largestSalePriceEth = tokenEntity.primaryValueInEth
    tokenEntity.lastSalePriceInEth = tokenEntity.primaryValueInEth
    tokenEntity.artistAccount = editionCreator
    tokenEntity.save()

    let sales = edition.sales
    sales.push(tokenEntity.id)
    edition.sales = sales

    edition.totalEthSpentOnEdition = edition.totalEthSpentOnEdition.plus((BigDecimal.fromString(event.params._price.toString()).div(ONE_ETH)))

    // Finally record any sales totals
    edition.totalSold = edition.totalSold.plus(ONE)

    edition.save()

    // Activity events
    let creator = editionCreator.equals(ZERO_ADDRESS) ? owner : editionCreator
    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, edition, tokenEntity, event.params._price, event.params._buyer);

    // Day events
    recordDayCounts(event, event.params._price);
    recordDayValue(event, event.params._tokenId, event.params._price);
    recordDayIssued(event, event.params._tokenId);

    // Update artist stats
    let kodaSettings = CreatorContractSetting.load('settings') as CreatorContractSetting
    let platformProceedsOfSale = (event.params._price.times(kodaSettings.platformPrimaryCommission)).div(kodaSettings.MODULO)
    let artistShareOfETHInWei = event.params._price.minus(platformProceedsOfSale)
    recordArtistValue(creator, tokenEntity.id, event.params._price, artistShareOfETHInWei, true);

    // Update token events
    tokenEventFactory.createTokenPrimaryPurchaseEvent(event, tokenEntity.id, event.params._buyer, event.params._price);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    let creatorContractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    creatorContractEntity.owner = event.params.newOwner
    creatorContractEntity.hasBeenTransferred = true;
    if (event.params.newOwner.equals(DEAD_ADDRESS) || event.params.newOwner.equals(ZERO_ADDRESS)) {
        if (creatorContractEntity.totalNumOfEditions > ZERO) {
            creatorContractEntity.transferState = BigInt.fromI32(2);
        } else {
            creatorContractEntity.transferState = BigInt.fromI32(1);
        }
    } else {
        creatorContractEntity.transferState = BigInt.fromI32(3);
    }
    creatorContractEntity.save()

    activityEventService.recordCCOwnershipTransferred(
        event.address.toHexString(),
        event.address.toHexString(),
        event
    );
}

export function handleSecondaryRoyaltyUpdated(event: DefaultRoyaltyPercentageUpdated): void {
    let creatorContractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    creatorContractEntity.secondaryRoyaltyPercentage = event.params._percentage
    creatorContractEntity.save()

    activityEventService.recordCCDefaultRoyaltyPercentageUpdated(
        event.address.toHexString(),
        event.address.toHexString(),
        event
    );
}

export function handleSecondaryEditionRoyaltyUpdated(event: EditionRoyaltyPercentageUpdated): void {
    let entityId = createV4Id(event.address.toHexString(), event.params._editionId.toString())
    let entity = Edition.load(entityId)
    if (entity != null) {
        entity.secondaryRoyaltyV4EditionOverride = event.params._percentage
        entity.save()

        activityEventService.recordCCEditionRoyaltyPercentageUpdated(
            event.address.toHexString(),
            entity.id,
            event,
            entity as Edition
        );
    }
}

export function handleEditionLevelFundSplitterSet(event: EditionFundsHandlerUpdated): void {
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    const edition = loadOrCreateV4Edition(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    if (edition != null) {

        let creatorContractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
        let editionFundsHandler = event.params._handler.toHexString();

        let collective = Collective.load(editionFundsHandler);

        if (collective == null) {
            collective = new Collective(editionFundsHandler);
            collective.baseHandler = event.params._handler;
            collective.creator = creatorContractEntity.owner; // only owner can trigger this action so capture it
            collective.recipients = new Array<Bytes>(); // set the fund handler as only recipient if it is not possible to query any recipients
            collective.splits = new Array<BigInt>(); // set to 100% if recipients array is length 1
            collective.createdTimestamp = event.block.timestamp;
            collective.transactionHash = event.transaction.hash;
            collective.editions = new Array<string>();
            collective.isDeployed = true;
        }

        let editions = collective.editions
        editions.push(edition.id)
        collective.editions = editions

        let maybeFundsHandlerContract = FundsHandler.bind(event.params._handler)
        let maybeTotalRecipientsResult = maybeFundsHandlerContract.try_totalRecipients()

        let defaultFundsRecipients = new Array<Bytes>()
        let defaultFundsShares = new Array<BigInt>()

        if (maybeTotalRecipientsResult.reverted == false) {
            let totalRecipients = maybeTotalRecipientsResult.value
            for (let i = ZERO; i.lt(totalRecipients); i = i.plus(ONE)) {
                let share = maybeFundsHandlerContract.shareAtIndex(i)
                defaultFundsRecipients.push(share.value0)
                defaultFundsShares.push(share.value1)
            }
        } else {
            defaultFundsRecipients.push(event.params._handler)
            defaultFundsShares.push(BigInt.fromString("10000000")) // TODO this should use EIP2981 lookup and not assume the %
        }

        collective.recipients = defaultFundsRecipients.map<Bytes>(a => (Bytes.fromHexString(a.toHexString()) as Bytes))
        collective.splits = defaultFundsShares

        collective.save()

        edition.collective = collective.id.toString()
        edition.save()

        activityEventService.recordCCEditionFundsHandlerUpdated(
            event.address.toHexString(),
            edition.id,
            event,
            edition
        );
    }
}

export function handleListedTokenForBuyNow(event: ListedTokenForBuyNow): void {
    let entityId = event.params._tokenId.toString() + '-' + event.address.toHexString();

    // Create listed token
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    );

    let creatorContractInstance = ERC721CreatorContract.bind(event.address)
    let listedEntity = loadOrCreateListedToken(entityId, edition);
    listedEntity.creatorContract = event.address.toHexString()
    listedEntity.listPrice = toEther(event.params._price)
    listedEntity.lister = creatorContractInstance.ownerOf(event.params._tokenId).toHexString()
    listedEntity.listingTimestamp = event.block.timestamp
    listedEntity.save();

    // update token info
    let tokenEntity = loadOrCreateV4Token(event.params._tokenId, event.address, creatorContractInstance, edition, event.block);
    tokenEntity.isListed = true;
    tokenEntity.salesType = SaleTypes.BUY_NOW
    tokenEntity.listPrice = toEther(event.params._price)
    tokenEntity.lister = creatorContractInstance.ownerOf(event.params._tokenId).toHexString()
    tokenEntity.listingTimestamp = event.block.timestamp
    tokenEntity.openOffer = null
    tokenEntity.currentTopBidder = null
    tokenEntity.save()

    activityEventService.recordSecondaryTokenListed(
        event,
        tokenEntity,
        edition,
        event.params._price,
        creatorContractInstance.ownerOf(event.params._tokenId)
    );
}

export function handleBuyNowTokenDeListed(event: BuyNowTokenDeListed): void {
    let entityId = event.params._tokenId.toString() + '-' + event.address.toHexString();
    store.remove("ListedToken", entityId);

    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let creatorContractInstance = ERC721CreatorContract.bind(event.address)

    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    );

    let tokenEntity = loadOrCreateV4Token(event.params._tokenId, event.address, creatorContractInstance, edition, event.block);
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY;
    tokenEntity.listPrice = ZERO_BIG_DECIMAL;
    tokenEntity.lister = null;
    tokenEntity.listingTimestamp = ZERO;
    tokenEntity.openOffer = null;
    tokenEntity.currentTopBidder = null;
    tokenEntity.save();

    activityEventService.recordSecondaryTokenDeListed(
        event,
        tokenEntity,
        creatorContractInstance.ownerOf(event.params._tokenId),
        edition
    );
}

export function handleBuyNowTokenPriceChanged(event: BuyNowTokenPriceChanged): void {
    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract
    let creatorContractInstance = ERC721CreatorContract.bind(event.address)
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    );

    let tokenEntity = loadOrCreateV4Token(event.params._tokenId, event.address, creatorContractInstance, edition, event.block);
    tokenEntity.listPrice = toEther(event.params._price);
    tokenEntity.save();

    let entityId = event.params._tokenId.toString() + '-' + event.address.toHexString();
    let listedEntity = loadOrCreateListedToken(entityId, edition);
    listedEntity.listPrice = toEther(event.params._price);
    listedEntity.save();

    activityEventService.recordSecondaryTokenListingPriceChange(
        event,
        tokenEntity,
        edition,
        event.params._price,
        creatorContractInstance.ownerOf(event.params._tokenId),
    );
}

export function handleBuyNowTokenPurchased(event: BuyNowTokenPurchased): void {
    let entityId = event.params._tokenId.toString() + '-' + event.address.toHexString();
    store.remove("ListedToken", entityId);
    let creatorContractInstance = ERC721CreatorContract.bind(event.address)

    let contractEntity = CreatorContract.load(event.address.toHexString()) as CreatorContract;
    contractEntity.totalNumOfTokensSold = contractEntity.totalNumOfTokensSold.plus(ONE)
    contractEntity.totalEthValueOfSales = contractEntity.totalEthValueOfSales.plus(BigDecimal.fromString(event.params._price.toString()).div(ONE_ETH))
    contractEntity.save()

    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    );

    let tokenEntity = loadOrCreateV4Token(event.params._tokenId, event.address, creatorContractInstance, edition, event.block);
    tokenEntity.totalPurchaseCount = tokenEntity.totalPurchaseCount.plus(ONE)
    tokenEntity.largestSalePriceEth = tokenEntity.largestSalePriceEth < toEther(event.params._price) ? toEther(event.params._price) : tokenEntity.largestSalePriceEth
    tokenEntity.lastSalePriceInEth = toEther(event.params._price)
    tokenEntity.isListed = false;
    tokenEntity.salesType = SaleTypes.OFFERS_ONLY;
    tokenEntity.listPrice = ZERO_BIG_DECIMAL;
    tokenEntity.lister = null;
    tokenEntity.listingTimestamp = ZERO;
    tokenEntity.openOffer = null;
    tokenEntity.currentTopBidder = null;
    tokenEntity.save();

    // Day events
    recordDayCounts(event, event.params._price);
    recordDayValue(event, event.params._tokenId, event.params._price);
    recordDayIssued(event, event.params._tokenId);

    // Update artist stats
    let kodaSettings = CreatorContractSetting.load('settings') as CreatorContractSetting
    let platformProceedsOfSale = (event.params._price.times(kodaSettings.platformSecondaryCommission)).div(kodaSettings.MODULO)
    let artistShareOfETHInWei = event.params._price.minus(platformProceedsOfSale)
    recordArtistValue(tokenEntity.artistAccount, entityId, event.params._price, artistShareOfETHInWei, false);

    // Update token events
    tokenEventFactory.createTokenSecondaryPurchaseEvent(
        event,
        tokenEntity.id,
        event.params._recipient,
        event.params._currentOwner,
        event.params._price
    );

    // activity event
    activityEventService.recordSecondarySale(
        event,
        tokenEntity,
        edition,
        event.params._price,
        event.params._recipient,
        event.params._currentOwner
    );
}
