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
    // EditionSalesDisabledToggled,
    // EditionURIUpdated,
    // TokenUriResolverSet,

    // TODO - index the secondary events
    ListedTokenForBuyNow,
    BuyNowTokenDeListed,
    BuyNowTokenPriceChanged,
    BuyNowTokenPurchased,
    BatchCreatorContract
} from "../../../generated/KnownOriginV4Factory/BatchCreatorContract";

import {
    CreatorContract,
    Edition,
    Collective,
    Token, CreatorContractSetting,
} from "../../../generated/schema"

import {ONE, ONE_ETH, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../../utils/constants";

import {
    loadOrCreateV4Edition,
    loadOrCreateV4EditionFromTokenId
} from "../../services/Edition.service";

import {BigDecimal, BigInt, Bytes, log} from "@graphprotocol/graph-ts/index";
import * as SaleTypes from "../../utils/SaleTypes";
import * as tokenEventFactory from "../../services/TokenEvent.factory";
import * as transferEventFactory from "../../services/TransferEvent.factory";
import * as activityEventService from "../../services/ActivityEvent.service";
import {loadOrCreateCollector} from "../../services/Collector.service";
import {loadOrCreateV4Token} from "../../services/Token.service";
import * as EVENT_TYPES from "../../utils/EventTypes";
import {
    addEditionToDay,
    recordDayCounts,
    recordDayIssued,
    recordDayTransfer,
    recordDayValue
} from "../../services/Day.service";
import {addEditionToArtist, recordArtistValue} from "../../services/Artist.service";

export function handlePaused(event: Paused): void {
    let entity = CreatorContract.load(event.address.toHexString());
    entity.paused = true;
    entity.save();
}

export function handleUnpaused(event: Unpaused): void {
    let entity = CreatorContract.load(event.address.toHexString());
    entity.paused = false;
    entity.save();
}

export function handleTransfer(event: Transfer): void {
    log.info("Calling handleTransfer() call for V4 contract {} ", [event.address.toHexString()])

    // Extract params for processing
    let contractEntity = CreatorContract.load(event.address.toHexString())
    let creatorContractInstance = BatchCreatorContract.bind(event.address)
    let editionId = creatorContractInstance.tokenEditionId(event.params.tokenId)
    let isNewEdition = Edition.load(editionId.toString() + "-" + event.address.toHexString()) == null

    // If the edition has never been seen before, it will be created
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params.tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    // Determine if default contract owner is the creator or if a creator override has been set
    let owner = creatorContractInstance.owner()
    let editionCreator = creatorContractInstance.editionCreator(edition.editionNmber)
    let creator = editionCreator.equals(ZERO_ADDRESS) ? owner : editionCreator

    // If the token is being gifted outside of marketplace (it is not being minted from zero to the edition creator)
    if (event.params.to.equals(creator) == false) {
        let collector = loadOrCreateCollector(event.params.to, event.block)
        let tokenEntity = loadOrCreateV4Token(event.params.tokenId, event.address, edition, event.block);

        // Add a new token owner
        let allOwners = tokenEntity.allOwners
        allOwners.push(collector.id)
        tokenEntity.allOwners = allOwners

        // Process transfer events and record them in various places
        let tEvent = transferEventFactory.createTransferEvent(event, event.params.tokenId, creator, event.params.to, edition)
        let transfers = tokenEntity.transfers
        transfers.push(tEvent.id)
        tokenEntity.transfers = transfers

        tokenEntity.currentOwner = event.params.to.toHexString()
        tokenEntity.editionActive = contractEntity.isHidden
        tokenEntity.artistAccount = creator
        tokenEntity.save()

        activityEventService.recordTransfer(event, tokenEntity, edition, event.params.from, event.params.to);

        // Record day stats
        recordDayTransfer(event);
        recordDayIssued(event, event.params.tokenId);

        // Record total number of transfers at the contract level
        contractEntity.totalNumOfTransfers = contractEntity.totalNumOfTransfers + ONE;

        // Token Events
        //tokenEventFactory.createTokenTransferEvent(event, event.params.tokenId, creator, event.params.to);
    }

    // Finally, if the edition is new, lets record its creation
    if (event.params.from.equals(ZERO_ADDRESS) && isNewEdition) {
        // Day counts
        addEditionToDay(event, edition.id);

        // Activity events
        activityEventService.recordEditionCreated(event, edition);

        // Creator contract counts
        contractEntity.totalNumOfEditions = contractEntity.totalNumOfEditions + ONE;

        let editions = contractEntity.editions;
        editions.push(edition.id);
        contractEntity.editions = editions;

        // Artist
        //addEditionToArtist(creator, edition.id, edition.totalAvailable, event.block.timestamp)
    }

    // Save entities at once
    edition.save();
    contractEntity.save();
}

export function handleListedForBuyItNow(event: ListedEditionForBuyNow): void {
    log.info("Calling handleListedForBuyItNow() call for contract {} ", [event.address.toHexString()])

    let contractEntity = CreatorContract.load(event.address.toHexString())
    let edition = loadOrCreateV4Edition(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    edition.startDate = event.params._startDate
    edition.priceInWei = event.params._price
    edition.salesType = SaleTypes.BUY_NOW

    edition.save()
}

export function handleBuyNowDeListed(event: BuyNowDeListed): void {
    let contractEntity = CreatorContract.load(event.address.toHexString())
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
}

export function handleBuyNowPriceChanged(event: BuyNowPriceChanged): void {
    let contractEntity = CreatorContract.load(event.address.toHexString())
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    )
    edition.priceInWei = event.params._price
    edition.save()

    activityEventService.recordPriceChanged(event, edition, event.params._price);
}

export function handleBuyNowPurchased(event: BuyNowPurchased): void {
    // Update creator contract stats
    let contractEntity = CreatorContract.load(event.address.toHexString())
    contractEntity.totalNumOfTokensSold = contractEntity.totalNumOfTokensSold + ONE
    contractEntity.save()

    // Load and update edition stats
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    let creatorContractInstance = BatchCreatorContract.bind(event.address)
    let owner = creatorContractInstance.owner()
    let editionCreator = creatorContractInstance.editionCreator(edition.editionNmber)

    edition.totalSupply = edition.totalSupply + ONE;
    edition.totalAvailable = edition.totalAvailable - ONE;
    edition.remainingSupply = edition.totalAvailable - edition.totalSupply
    edition.totalSold = edition.totalSold + ONE

    let tokenIds = edition.tokenIds
    tokenIds.push(event.params._tokenId)
    edition.tokenIds

    // Update token sale stats
    let tokenEntity = loadOrCreateV4Token(event.params._tokenId, event.address, edition, event.block);
    tokenEntity.primaryValueInEth = BigDecimal.fromString(event.params._price.toString()) / ONE_ETH
    tokenEntity.totalPurchaseValue = BigDecimal.fromString(event.params._price.toString()) / ONE_ETH
    tokenEntity.totalPurchaseCount = ONE
    tokenEntity.largestSalePriceEth = tokenEntity.primaryValueInEth
    tokenEntity.save()

    let sales = edition.sales
    sales.push(tokenEntity.id)
    edition.sales = sales

    edition.totalEthSpentOnEdition = edition.totalEthSpentOnEdition + (BigDecimal.fromString(event.params._price.toString()) / ONE_ETH)

    edition.save()

    // Activity events
    let creator = editionCreator.equals(ZERO_ADDRESS) ? owner : editionCreator
    activityEventService.recordTransfer(event, tokenEntity, edition, creator, event.params._buyer);
    activityEventService.recordPrimarySaleEvent(event, EVENT_TYPES.PURCHASE, edition, tokenEntity, event.params._price, event.params._buyer);

    // Day events
    recordDayTransfer(event);
    recordDayCounts(event, event.params._price);
    recordDayValue(event, event.params._tokenId, event.params._price);
    recordDayIssued(event, event.params._tokenId);

    // Update artist stats
    // TODO - the code for working out platform proceeds is failing... look at why
    //let kodaSettings = CreatorContractSetting.load('settings')
    let platformProceedsOfSale = BigInt.fromI32(0) //(event.params._price * kodaSettings.platformPrimaryCommission) / kodaSettings.MODULO
    let artistShareOfETHInWei = event.params._price - platformProceedsOfSale
    //recordArtistValue(creator, event.params._tokenId, event.params._price, artistShareOfETHInWei, true);

    // Update token events
    //tokenEventFactory.createTokenPrimaryPurchaseEvent(event, event.params._tokenId, event.params._buyer, event.params._price);
    //tokenEventFactory.createTokenTransferEvent(event, event.params._tokenId, creator, event.params._buyer);
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    let creatorContractEntity = CreatorContract.load(event.address.toHexString())
    creatorContractEntity.owner = event.params.newOwner
    creatorContractEntity.save()
}

export function handleSecondaryRoyaltyUpdated(event: DefaultRoyaltyPercentageUpdated): void {
    let creatorContractEntity = CreatorContract.load(event.address.toHexString())
    creatorContractEntity.secondaryRoyaltyPercentage = event.params._percentage
    creatorContractEntity.save()
}

export function handleSecondaryEditionRoyaltyUpdated(event: EditionRoyaltyPercentageUpdated): void {
    let entityId = event.params._editionId.toString() + "-" + event.address.toHexString()
    let entity = Edition.load(entityId)
    if (entity != null) {
        entity.secondaryRoyaltyV4EditionOverride = event.params._percentage
        entity.save()
    }
}

export function handleEditionLevelFundSplitterSet(event: EditionFundsHandlerUpdated): void {
    let contractEntity = CreatorContract.load(event.address.toHexString())
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._editionId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    let creatorContractEntity = CreatorContract.load(event.address.toHexString())
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

    // TODO - will need to populate the array if it adheres to funds handler interface and has many collabs
    let defaultFundsRecipients = new Array<Bytes>()
    let defaultFundsShares = new Array<BigInt>()
    defaultFundsRecipients.push(event.params._handler)
    defaultFundsShares.push(BigInt.fromString("10000000"))

    creatorContractEntity.defaultFundsRecipients = defaultFundsRecipients
    creatorContractEntity.defaultFundsShares = defaultFundsShares

    collective.recipients = creatorContractEntity.defaultFundsRecipients
    collective.splits = creatorContractEntity.defaultFundsShares

    collective.save()

    edition.collective = editionFundsHandler
    edition.save()
}