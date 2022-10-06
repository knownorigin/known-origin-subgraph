import {
    SelfSovereignERC721Deployed,
    CreatorContractBanned
} from "../../../generated/KnownOriginV4Factory/KnownOriginV4Factory";

import {
    FundsHandler
} from "../../../generated/KnownOriginV4Factory/FundsHandler";

import {
    BatchCreatorContract
} from "../../../generated/KnownOriginV4Factory/BatchCreatorContract";

import {
    CreatorContract
} from "../../../generated/schema"

import {
    CreatorContract as CreatorContractTemplate
} from '../../../generated/templates';

import {Bytes, BigInt} from "@graphprotocol/graph-ts/index";
import {ZERO, ONE} from "../../utils/constants";
import {loadOrCreateArtist} from "../../services/Artist.service";

export function handleSelfSovereignERC721Deployed(event: SelfSovereignERC721Deployed): void {
    // Capture the contract global properties so the list of creator contracts can be fetched
    let creatorContractEntity = new CreatorContract(event.params.selfSovereignNFT.toHexString())
    let sovereignContractInstance = BatchCreatorContract.bind(event.params.selfSovereignNFT)
    creatorContractEntity.deploymentBlockNumber = event.block.number
    creatorContractEntity.deploymentTimestamp = event.block.timestamp
    creatorContractEntity.implementation = event.params.implementation
    creatorContractEntity.deployer = event.params.deployer
    creatorContractEntity.creator = event.params.artist
    creatorContractEntity.owner = event.params.artist
    creatorContractEntity.minter = event.params.artist
    creatorContractEntity.isHidden = false
    creatorContractEntity.paused = false
    creatorContractEntity.totalNumOfEditions = ZERO
    creatorContractEntity.totalNumOfTokensSold = ZERO
    creatorContractEntity.totalNumOfTransfers = ZERO
    creatorContractEntity.editions = new Array<string>()

    creatorContractEntity.secondaryRoyaltyPercentage = sovereignContractInstance.defaultRoyaltyPercentage()

    // ERC165 interface lookup
    creatorContractEntity.isBatchBuyItNow = true
    // TODO - when there is the ability to deploy different types of creator contract, then the exact interface ID can be captured

    // Inform the subgraph to index events from the creator creatorContractEntity
    CreatorContractTemplate.create(event.params.selfSovereignNFT)

    // Check if the funds handler is a self sovereign funds handler or just a regular address
    creatorContractEntity.defaultFundsHandler = event.params.fundsHandler
    let maybeFundsHandlerContract = FundsHandler.bind(event.params.fundsHandler)
    let maybeTotalRecipientsResult = maybeFundsHandlerContract.try_totalRecipients()

    let defaultFundsRecipients = new Array<Bytes>()
    let defaultFundsShares = new Array<BigInt>()
    if (maybeTotalRecipientsResult.reverted == false) {
        let totalRecipients = maybeTotalRecipientsResult.value

        for(let i = ZERO; i.lt(totalRecipients); i = i.plus(ONE)) {
            let share = maybeFundsHandlerContract.shareAtIndex(i)
            defaultFundsRecipients.push(share.value0)
            defaultFundsShares.push(share.value1)
        }

        creatorContractEntity.defaultFundsRecipients = defaultFundsRecipients
        creatorContractEntity.defaultFundsShares = defaultFundsShares
    } else {
        // in this case there is just 1 default address that will receive 100%
        defaultFundsRecipients.push(event.params.fundsHandler)
        defaultFundsShares.push(BigInt.fromString("10000000"))

        creatorContractEntity.defaultFundsRecipients = defaultFundsRecipients
        creatorContractEntity.defaultFundsShares = defaultFundsShares
    }

    creatorContractEntity.save()

    // Update the artist
    let artistEntity = loadOrCreateArtist(event.params.artist)
    let creatorContracts = artistEntity.creatorContracts
    creatorContracts.push(event.params.selfSovereignNFT.toHexString())
    artistEntity.creatorContracts = creatorContracts
    artistEntity.save()
}

export function handleCreatorContractBanned(event: CreatorContractBanned): void {
    let creatorContractEntity = CreatorContract.load(event.params._contract.toHexString())
    creatorContractEntity.isHidden = true
    creatorContractEntity.save()
}