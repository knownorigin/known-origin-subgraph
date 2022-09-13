import {
    OwnershipTransferred,
    Transfer,
    SecondaryRoyaltyUpdated,
    SecondaryEditionRoyaltyUpdated,
    ListedEditionForBuyNow
} from "../../../generated/KnownOriginV4Factory/BatchCreatorContract";

import {
    CreatorContract,
    Edition
} from "../../../generated/schema"

import {ZERO_ADDRESS} from "../../utils/constants";

import {
    loadOrCreateV4Edition,
    loadOrCreateV4EditionFromTokenId
} from "../../services/Edition.service";

import {BigInt, log} from "@graphprotocol/graph-ts/index";

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