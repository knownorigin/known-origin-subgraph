import {BigInt} from "@graphprotocol/graph-ts"
import {
    Contract,
    Purchase,
    Minted,
    EditionCreated,
    Pause,
    Unpause,
    OwnershipRenounced,
    OwnershipTransferred,
    RoleAdded,
    RoleRemoved,
    Transfer,
    Approval,
    ApprovalForAll
} from "../generated/Contract/Contract"
import {Token} from "../generated/schema"

export function handlePurchase(event: Purchase): void {
    // // Entities can be loaded from the store using a string ID; this ID
    // // needs to be unique across all entities of the same type
    // let entity = ExampleEntity.load(event.transaction.from.toHex())
    //
    // // Entities only exist after they have been saved to the store;
    // // `null` checks allow to create entities on demand
    // if (entity == null) {
    //   entity = new ExampleEntity(event.transaction.from.toHex())
    //
    //   // Entity fields can be set using simple assignments
    //   entity.count = BigInt.fromI32(0)
    // }
    //
    // // BigInt and BigDecimal math are supported
    // entity.count = entity.count + BigInt.fromI32(1)
    //
    // // Entity fields can be set based on event parameters
    // entity._tokenId = event.params._tokenId
    // entity._editionNumber = event.params._editionNumber
    //
    // // Entities can be written to the store with `.save()`
    // entity.save()
    //
    // // Note: If a handler doesn't require existing field values, it is faster
    // // _not_ to load the entity from the store. Instead, create it fresh with
    // // `new Entity(...)`, set the fields that should be updated and save the
    // // entity back to the store. Fields that were not set or unset remain
    // // unchanged, allowing for partial updates to be applied.
    //
    // // It is also possible to access smart contracts from mappings. For
    // // example, the contract that has emitted the event can be connected to
    // // with:
    // //
    // // let contract = Contract.bind(event.address)
    // //
    // // The following functions can then be called on this contract to access
    // // state variables and other data:
    // //
    // // - contract.supportsInterface(...)
    // // - contract.name(...)
    // // - contract.getApproved(...)
    // // - contract.priceInWeiToken(...)
    // // - contract.totalSupply(...)
    // // - contract.InterfaceId_ERC165(...)
    // // - contract.editionData(...)
    // // - contract.totalPurchaseValueInWei(...)
    // // - contract.tokenOfOwnerByIndex(...)
    // // - contract.artistCommission(...)
    // // - contract.tokenURIEdition(...)
    // // - contract.mint(...)
    // // - contract.totalNumberAvailable(...)
    // // - contract.priceInWeiEdition(...)
    // // - contract.tokenBaseURI(...)
    // // - contract.exists(...)
    // // - contract.tokenByIndex(...)
    // // - contract.editionType(...)
    // // - contract.tokensOf(...)
    // // - contract.paused(...)
    // // - contract.ownerOf(...)
    // // - contract.purchaseDatesEdition(...)
    // // - contract.artistsEditions(...)
    // // - contract.totalAvailableEdition(...)
    // // - contract.koCommissionAccount(...)
    // // - contract.balanceOf(...)
    // // - contract.detailsOfEdition(...)
    // // - contract.tokensOfEdition(...)
    // // - contract.underMint(...)
    // // - contract.editionOfTokenId(...)
    // // - contract.createActiveEdition(...)
    // // - contract.owner(...)
    // // - contract.ROLE_MINTER(...)
    // // - contract.hasRole(...)
    // // - contract.symbol(...)
    // // - contract.ROLE_UNDER_MINTER(...)
    // // - contract.createInactivePreMintedEdition(...)
    // // - contract.highestEditionNumber(...)
    // // - contract.createActivePreMintedEdition(...)
    // // - contract.tokenData(...)
    // // - contract.totalSupplyEdition(...)
    // // - contract.purchaseDatesToken(...)
    // // - contract.editionActive(...)
    // // - contract.totalRemaining(...)
    // // - contract.ROLE_KNOWN_ORIGIN(...)
    // // - contract.editionExists(...)
    // // - contract.tokenURI(...)
    // // - contract.editionOptionalCommission(...)
    // // - contract.createInactiveEdition(...)
    // // - contract.editionsOfType(...)
    // // - contract.isApprovedForAll(...)
    // // - contract.totalNumberMinted(...)
    // // - contract.tokenURISafe(...)
}

export function handleMinted(event: Minted): void {
}

export function handleEditionCreated(event: EditionCreated): void {
}

export function handlePause(event: Pause): void {
}

export function handleUnpause(event: Unpause): void {
}

export function handleOwnershipRenounced(event: OwnershipRenounced): void {
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
}

export function handleRoleAdded(event: RoleAdded): void {
}

export function handleRoleRemoved(event: RoleRemoved): void {
}

export function handleTransfer(event: Transfer): void {
    // Entities can be loaded from the store using a string ID; this ID
    // needs to be unique across all entities of the same type
    let entity = Token.load(event.params._tokenId.toHex())

    // Entities only exist after they have been saved to the store;
    // `null` checks allow to create entities on demand
    if (entity == null) {
        entity = new Token(event.params._tokenId.toHex())

        // Entity fields can be set using simple assignments
        entity.owners = BigInt.fromI32(1)
    }

    // BigInt and BigDecimal math are supported
    entity.owners = entity.owners + BigInt.fromI32(1)

    // Entity fields can be set based on event parameters
    entity.from = event.params._from
    entity.to = event.params._to

    // Entities can be written to the store with `.save()`
    entity.save()
}

export function handleApproval(event: Approval): void {
}

export function handleApprovalForAll(event: ApprovalForAll): void {
}
