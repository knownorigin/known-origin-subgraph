import {
    BigInt,
    BigDecimal,
    Bytes,
    ipfs,
    json,
    log,
    JSONValue,
    Address,
    EthereumEvent
} from "@graphprotocol/graph-ts"

import {
    KnownOrigin,
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
} from "../generated/KnownOrigin/KnownOrigin"

import {Token, Day, Month, Edition, MetaData} from "../generated/schema"

let ONE_ETH = new BigDecimal(BigInt.fromI32(1).times(BigInt.fromI32(10).pow(18)))
let secondsInDay = BigInt.fromI32(86400)
function dayNumberFromEvent(event: EthereumEvent): string {
    return event.block.timestamp.div(secondsInDay).toBigDecimal().truncate(0).toString()
}

function loadDayOrGetNewEntity(dayNumber: string): Day | null {
    let dayEntity: Day | null = Day.load(dayNumber)

    if (dayEntity === null) {
        dayEntity = new Day(dayNumber)
        dayEntity.date = dayNumber
        dayEntity.transferCount = BigInt.fromI32(0)
        dayEntity.totalValue = BigInt.fromI32(0)
        dayEntity.totalValueInEth = new BigDecimal(BigInt.fromI32(0))
        dayEntity.totalGasUsed = BigInt.fromI32(0)
        dayEntity.highestValue = BigInt.fromI32(0)
        dayEntity.highestValueInEth = new BigDecimal(BigInt.fromI32(0))
        dayEntity.highestGasPrice = BigInt.fromI32(0)
        dayEntity.sales = new Array<string>()
        dayEntity.editions = new Array<string>()
    }

    return dayEntity;
}

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
    let contract = KnownOrigin.bind(event.address)
    let _editionData = contract.detailsOfEdition(event.params._editionNumber)

    let editionEntity = Edition.load(event.params._editionNumber.toString());
    if (editionEntity == null) {
        editionEntity = new Edition(event.params._editionNumber.toString());

        editionEntity.createdTimestamp = event.block.timestamp
        editionEntity.editionData = event.params._editionData
        editionEntity.editionType = event.params._editionType
        editionEntity.startDate = _editionData.value2
        editionEntity.endDate = _editionData.value3
        editionEntity.artistAccount = _editionData.value4
        editionEntity.artistCommission = _editionData.value5
        editionEntity.priceInWei = _editionData.value6
        editionEntity.tokenURI = _editionData.value7
        editionEntity.totalSupply = _editionData.value8
        editionEntity.totalAvailable = _editionData.value9
        editionEntity.active = _editionData.value10

        log.info("token URI [{}]", [_editionData.value7])

        let ipfsParts: string[] = editionEntity.tokenURI.split('/')
        let ipfsHash: string = ipfsParts[ipfsParts.length - 1];

        let metaData: MetaData = new MetaData(ipfsHash)

        if (ipfsParts.length > 0) {
            let data = ipfs.cat(ipfsHash)
            if (data !== null) {
                let jsonData: JSONValue = json.fromBytes(data as Bytes)
                metaData.name = jsonData.toObject().get('name').toString()
                metaData.description = jsonData.toObject().get('description').toString()
                metaData.image = jsonData.toObject().get('image').toString()

                if (jsonData.toObject().isSet('scarcity')) {
                    metaData.scarcity = jsonData.toObject().get('scarcity').toString()
                }
                if (jsonData.toObject().isSet('artist')) {
                    metaData.artist = jsonData.toObject().get('artist').toString()
                }
                if (jsonData.toObject().isSet('attributes')) {
                    let attributes: JSONValue = jsonData.toObject().get('attributes') as JSONValue;
                    if (attributes.toObject().isSet("tags")) {
                        let rawTags: JSONValue[] = attributes.toObject().get("tags").toArray();
                        let tags: Array<string> = rawTags.map<string>((value, i, values) => {
                            return value.toString();
                        });
                        metaData.tags = tags;
                    }
                }
            }
        }
        metaData.save()
        editionEntity.metadata = ipfsHash
    }

    editionEntity.tokenIds = new Array<BigInt>()
    editionEntity.auctionEnabled = false;
    editionEntity.save()

    // Update the day's stats
    let dayAsNumberString = dayNumberFromEvent(event)
    let dayEntity = loadDayOrGetNewEntity(dayAsNumberString)

    let editions = dayEntity.editions
    editions.push(editionEntity.id.toString())
    dayEntity.editions = editions

    dayEntity.save()
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
    let contract = KnownOrigin.bind(event.address)
    let _tokenData = contract.tokenData(event.params._tokenId)

    // TOKEN
    let tokenEntity = Token.load(event.params._tokenId.toString())
    if (tokenEntity == null) {
        // type Token @entity {
        //     id: ID!
        //     tokenId: BigInt!
        //     from: Bytes! # address
        //     to: Bytes! # address
        //     ownerCount: BigInt!
        //     editionNumber: BigInt!
        //     tokenURI: String!
        //     name: String
        //     description: String
        //     image: String
        // }

        tokenEntity = new Token(event.params._tokenId.toString())

        // Entity fields can be set using simple assignments
        tokenEntity.ownerCount = BigInt.fromI32(0) // set up the owner count
        tokenEntity.tokenId = event.params._tokenId
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.highestValue = BigInt.fromI32(0)
        tokenEntity.highestValueInEth = new BigDecimal(BigInt.fromI32(0))

        // IPFS - these need to be in graph's IPFS node for now
        let ipfsParts: string[] = _tokenData.value3.split('/')
        if (ipfsParts.length > 0) {

            let path: string = ipfsParts[ipfsParts.length - 1]
            let data = ipfs.cat(path)
            if (data !== null) {
                let jsonData: JSONValue = json.fromBytes(data as Bytes)
                tokenEntity.name = jsonData.toObject().get('name').toString()
                tokenEntity.description = jsonData.toObject().get('description').toString()
                tokenEntity.image = jsonData.toObject().get('image').toString()
                // tokenEntity.tags = jsonData.toObject().get('attributes').toObject().get('tags').toArray()

                log.info("Adding [{}]", [tokenEntity.name])
            }
        }

        tokenEntity.tokenURI = _tokenData.value3
    }

    tokenEntity.ownerCount = tokenEntity.ownerCount + BigInt.fromI32(1)

    if (event.transaction.value > tokenEntity.highestValue) {
        tokenEntity.highestValue = event.transaction.value

        tokenEntity.highestValueInEth = new BigDecimal(event.transaction.value) / ONE_ETH
    }

    tokenEntity.from = event.params._from
    tokenEntity.to = event.params._to

    tokenEntity.save()

    // DAY
    let dayAsNumberString = dayNumberFromEvent(event)
    let dayEntity = loadDayOrGetNewEntity(dayAsNumberString)

    dayEntity.transferCount = dayEntity.transferCount + BigInt.fromI32(1)
    dayEntity.totalValue = dayEntity.totalValue + event.transaction.value
    dayEntity.totalValueInEth = dayEntity.totalValueInEth + (new BigDecimal(event.transaction.value) / ONE_ETH)
    dayEntity.totalGasUsed = dayEntity.totalGasUsed + event.transaction.gasUsed

    dayEntity.highestGasPrice = (event.transaction.gasPrice > dayEntity.highestGasPrice) ? event.transaction.gasPrice : dayEntity.highestGasPrice

    if (event.transaction.value > dayEntity.highestValue) {
        dayEntity.highestValueToken = event.params._tokenId.toString()
        dayEntity.highestValue = event.transaction.value

        dayEntity.highestValueInEth = new BigDecimal(event.transaction.value) / ONE_ETH
    }

    // if a new sale add to sales
    if (event.params._from.equals(Address.fromString("0x0000000000000000000000000000000000000000"))) {
        let sales = dayEntity.sales
        sales.push(tokenEntity.id.toString())
        dayEntity.sales = sales
    }

    dayEntity.save()

    // MONTH
    let monthAsNumberString = event.block.timestamp.div(secondsInDay * BigInt.fromI32(30)).toBigDecimal().truncate(0).toString()
    let monthEntity = Month.load(monthAsNumberString)
    if (monthEntity == null) {
        // type Month @entity {
        //     id: ID!
        //     date: String!
        //     transferCount: BigInt!
        //     totalValue: BigInt!
        //     totalValueInEth: BigDecimal!
        //     highestValue: BigInt!
        //     highestValueInEth: BigDecimal!
        //     highestValueToken: Token
        // }

        monthEntity = new Month(monthAsNumberString)
        monthEntity.date = monthAsNumberString
        monthEntity.transferCount = BigInt.fromI32(0)
        monthEntity.totalValue = BigInt.fromI32(0)
        monthEntity.totalValueInEth = new BigDecimal(BigInt.fromI32(0))
        monthEntity.highestValue = BigInt.fromI32(0)
        monthEntity.highestValueInEth = new BigDecimal(BigInt.fromI32(0))
    }

    monthEntity.transferCount = monthEntity.transferCount + BigInt.fromI32(1)
    monthEntity.totalValue = monthEntity.totalValue + event.transaction.value
    monthEntity.totalValueInEth = monthEntity.totalValueInEth + (new BigDecimal(event.transaction.value) / ONE_ETH)

    if (event.transaction.value > monthEntity.highestValue) {
        monthEntity.highestValueToken = event.params._tokenId.toString()
        monthEntity.highestValue = event.transaction.value

        monthEntity.highestValueInEth = new BigDecimal(event.transaction.value) / ONE_ETH
    }

    monthEntity.save()
}

export function handleApproval(event: Approval): void {
}

export function handleApprovalForAll(event: ApprovalForAll): void {
}
