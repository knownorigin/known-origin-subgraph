import {
    SelfSovereignERC721Deployed,
    CreatorContractBanned,
    ContractDeployed,
    KnownOriginV4Factory
} from "../../../generated/KnownOriginV4Factory/KnownOriginV4Factory";

import {
    KODASettings
} from "../../../generated/KnownOriginV4Factory/KODASettings";

import {
    FundsHandler
} from "../../../generated/KnownOriginV4Factory/FundsHandler";

import {
    ERC721KODACreatorWithBuyItNow
} from "../../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";

import {
    CreatorContract,
    CreatorContractSetting
} from "../../../generated/schema"

import {
    CreatorContract as CreatorContractTemplate
} from '../../../generated/templates';

import {Bytes, BigInt} from "@graphprotocol/graph-ts/index";
import {ZERO, ONE, ZERO_BIG_DECIMAL} from "../../utils/constants";
import {loadOrCreateArtist} from "../../services/Artist.service";

// Index the deployment of the factory in order to capture the global V4 params
export function handleContractDeployed(event: ContractDeployed): void {
    let factoryContractInstance = KnownOriginV4Factory.bind(event.address)

    let settings = new CreatorContractSetting('settings');
    settings.factoryContract = event.address
    settings.kodaSalesSettingsContract = factoryContractInstance.platformSettings()

    let settingsContractInstance = KODASettings.bind(factoryContractInstance.platformSettings())

    settings.platform = settingsContractInstance.platform()
    settings.platformPrimaryCommission = settingsContractInstance.platformPrimaryCommission()
    settings.platformSecondaryCommission = settingsContractInstance.platformSecondaryCommission()
    settings.MODULO = BigInt.fromI32(settingsContractInstance.MODULO())
    settings.save()
}

export function handleSelfSovereignERC721Deployed(event: SelfSovereignERC721Deployed): void {
    // Capture the contract global properties so the list of creator contracts can be fetched
    let creatorContractEntity = new CreatorContract(event.params.selfSovereignNFT.toHexString())
    let sovereignContractInstance = ERC721KODACreatorWithBuyItNow.bind(event.params.selfSovereignNFT)
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
    creatorContractEntity.totalEthValueOfSales = ZERO_BIG_DECIMAL
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

        for (let i = ZERO; i.lt(totalRecipients); i = i.plus(ONE)) {
            let share = maybeFundsHandlerContract.shareAtIndex(i)
            defaultFundsRecipients.push(share.value0)
            defaultFundsShares.push(share.value1)
        }

    } else {
        // in this case there is just 1 default address that will receive 100%
        defaultFundsRecipients.push(event.params.fundsHandler)
        defaultFundsShares.push(BigInt.fromString("10000000"))
    }

    creatorContractEntity.defaultFundsRecipients = defaultFundsRecipients
    creatorContractEntity.defaultFundsShares = defaultFundsShares

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
    creatorContractEntity.isHidden = event.params._banned
    creatorContractEntity.save()
}