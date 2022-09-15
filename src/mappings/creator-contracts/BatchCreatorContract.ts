import {
    Paused,
    Unpaused,
    SubMinterConfigured,
    OwnershipTransferred,
    Transfer,
    SecondaryRoyaltyUpdated,
    SecondaryEditionRoyaltyUpdated,
    ListedEditionForBuyNow,
    BuyNowDeListed,
    BuyNowPriceChanged,
    BuyNowPurchased,

    EditionLevelFundSplitterSet,
    EditionSalesDisabledToggled,
    EditionURIUpdated,
    TokenUriResolverSet,

    // TODO - index the secondary events
    ListedTokenForBuyNow,
    BuyNowTokenDeListed,
    BuyNowTokenPriceChanged,
    BuyNowTokenPurchased
} from "../../../generated/KnownOriginV4Factory/BatchCreatorContract";

import {
    CreatorContract,
    Edition,
    Collective
} from "../../../generated/schema"

import {ONE, ZERO, ZERO_ADDRESS} from "../../utils/constants";

import {
    loadOrCreateV4Edition,
    loadOrCreateV4EditionFromTokenId
} from "../../services/Edition.service";

import {BigInt, log} from "@graphprotocol/graph-ts/index";
import * as SaleTypes from "../../utils/SaleTypes";

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
        event.params._id,
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
    let edition = loadOrCreateV4Edition(
        event.params._id,
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
    let edition = loadOrCreateV4Edition(
        event.params._id,
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
    // editionEntity.remainingSupply = editionEntity.totalAvailable
    // TODO - not sure about remaining supply?

    edition.save()
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
    let creatorContractEntity = CreatorContract.load(event.address.toHexString())
    creatorContractEntity.owner = event.params.newOwner
    creatorContractEntity.save()
}

export function handleSecondaryRoyaltyUpdated(event: SecondaryRoyaltyUpdated): void {
    let creatorContractEntity = CreatorContract.load(event.address.toHexString())
    creatorContractEntity.secondaryRoyaltyPercentage = event.params.newRoyalty
    creatorContractEntity.save()
}

export function handleSecondaryEditionRoyaltyUpdated(event: SecondaryEditionRoyaltyUpdated): void {
    let entityId = event.params.editionId.toString() + "-" + event.address.toHexString()
    let entity = Edition.load(entityId)
    if (entity != null) {
        entity.secondaryRoyaltyV4EditionOverride = event.params.newRoyalty
        entity.save()
    }
}

// TODO - this is not yet safe to enable. Returning to this later once more clarity is achieved
// export function handleEditionLevelFundSplitterSet(event: EditionLevelFundSplitterSet): void {
//     // let baseEditionId = event.params.editionId // scoped edition ID to the contract
//     // let editionEntityId = event.params.editionId.toString() + "-" + event.address.toHexString() // global edition ID across all 4 versions
//     //
//     // let contractEntity = CreatorContract.load(event.address.toHexString())
//     let edition = loadOrCreateV4Edition(
//         event.params.editionId,
//         event.block,
//         event.address,
//         contractEntity.isHidden
//     )
//     //
//     let creatorContractEntity = CreatorContract.load(event.address.toHexString())
//     let editionFundsHandler; // TODO - get this from contract
//
//     let collective = new Collective(editionFundsHandler); // todo - get or load instead of always create
//     collective.baseHandler; // todo - get from factory
//     collective.creator = creatorContractEntity.owner(); // only owner can trigger this action so capture it
//     collective.recipients = new Array<string>(); // set the fund handler as only recipient if it is not possible to query any recipients
//     collective.splits = new Array<BigInt>(); // set to 100% if recipients array is length 1
//     collective.createdTimestamp = event.block.timestamp; // todo - not sure what to do here as the fund handler edition override can be set any time so just taking current block timestamp at time of event
//     collective.transactionHash = event.transaction.hash;
//     collective.editions = new Array<string>(); // todo - for every edition that uses this funds handler, track it
//     collective.isDeployed = true; // todo - always set this to true.
//     collective.save()
//
//     edition.collective = editionFundsHandler
//
//     edition.save()
// }