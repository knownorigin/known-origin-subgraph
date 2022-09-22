import {
    Paused,
    Unpaused,
    //SubMinterConfigured,
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
    BuyNowTokenPurchased
} from "../../../generated/KnownOriginV4Factory/BatchCreatorContract";

import {
    CreatorContract,
    Edition,
    Collective,
    Token,
} from "../../../generated/schema"

import {ONE, ONE_ETH, ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../../utils/constants";

import {
    loadOrCreateV4Edition,
    loadOrCreateV4EditionFromTokenId
} from "../../services/Edition.service";

import {Address, BigDecimal, BigInt, Bytes, log} from "@graphprotocol/graph-ts/index";
import * as SaleTypes from "../../utils/SaleTypes";
import * as transferEventFactory from "../../services/TransferEvent.factory";
import {loadOrCreateCollector} from "../../services/Collector.service";

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
    log.info("Calling handleTransfer() call for contract {} ", [event.address.toHexString()])

    let contractEntity = CreatorContract.load(event.address.toHexString())

    if (event.params.from.equals(ZERO_ADDRESS)) { // Mint
        let edition = loadOrCreateV4EditionFromTokenId(
            event.params.tokenId,
            event.block,
            event.address,
            contractEntity.isHidden
        )
        edition.version = BigInt.fromI32(4)
        edition.save()
    }
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
}

export function handleBuyNowPurchased(event: BuyNowPurchased): void {
    let contractEntity = CreatorContract.load(event.address.toHexString())
    let edition = loadOrCreateV4EditionFromTokenId(
        event.params._tokenId,
        event.block,
        event.address,
        contractEntity.isHidden
    )

    edition.totalSupply = edition.totalSupply + ONE;
    edition.totalAvailable = edition.totalAvailable - ONE;
    edition.remainingSupply = edition.totalAvailable - edition.totalSupply
    edition.totalSold = edition.totalSold + ONE

    let tokenIds = edition.tokenIds
    tokenIds.push(event.params._tokenId)
    edition.tokenIds

    let tokenEntityId = event.params._tokenId.toString() + "-" + event.address.toHexString()
    let tokenEntity = new Token(tokenEntityId)
    tokenEntity.version = BigInt.fromString("4")
    tokenEntity.salesType = edition.salesType
    tokenEntity.tokenId = event.params._tokenId
    tokenEntity.transferCount = ONE
    tokenEntity.editionNumber = edition.editionNmber
    tokenEntity.edition = edition.id
    tokenEntity.tokenURI = edition.tokenURI
    tokenEntity.metadata = edition.metadata
    tokenEntity.birthTimestamp = event.block.timestamp
    tokenEntity.primaryValueInEth = BigDecimal.fromString(event.params._price.toString()) / ONE_ETH
    tokenEntity.totalPurchaseValue = BigDecimal.fromString(event.params._price.toString()) / ONE_ETH
    tokenEntity.totalPurchaseCount = ONE
    tokenEntity.largestSecondaryValueInEth = ZERO_BIG_DECIMAL
    tokenEntity.largestSalePriceEth = tokenEntity.primaryValueInEth
    tokenEntity.lastTransferTimestamp = event.block.timestamp

    let collector = loadOrCreateCollector(event.params._buyer, event.block)
    tokenEntity.currentOwner = event.params._buyer.toHexString()

    let allOwners = new Array<string>()
    allOwners.push(collector.id)
    tokenEntity.allOwners = allOwners

    let tEvent = transferEventFactory.createTransferEvent(event, event.params._tokenId, Address.fromString(contractEntity.owner.toHexString()), event.params._buyer, edition)
    let transfers = new Array<string>()
    transfers.push(tEvent.id)
    tokenEntity.transfers = transfers

    tokenEntity.tokenEvents = new Array<string>() // todo - index

    tokenEntity.editionActive = contractEntity.isHidden
    tokenEntity.revokedApproval = false
    tokenEntity.isListed = false

    tokenEntity.artistAccount = contractEntity.owner // TODO - check this
    tokenEntity.save()

    let tokens = edition.tokens
    tokens.push(tokenEntity.id)
    edition.tokens = tokens
    edition.sales = tokens
    edition.totalEthSpentOnEdition = edition.totalEthSpentOnEdition + (BigDecimal.fromString(event.params._price.toString()) / ONE_ETH)

    edition.save()
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

    // TODO - de dupe
    let editions = collective.editions
    editions.push(edition.id)
    collective.editions = editions

    // TODO - will need to do population if it adheres to interface
    // collective.recipients
    // collective.splits

    collective.save()

    edition.collective = editionFundsHandler
    edition.save()
}