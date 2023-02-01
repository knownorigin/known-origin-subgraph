import {log} from "@graphprotocol/graph-ts/index";
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
    CreatorContractSetting, Edition, Token
} from "../../../generated/schema"

import {
    CreatorContract as CreatorContractTemplate
} from '../../../generated/templates';

import {Bytes, BigInt} from "@graphprotocol/graph-ts/index";
import {ZERO, ONE, ZERO_BIG_DECIMAL, DEAD_ADDRESS, ZERO_ADDRESS} from "../../utils/constants";
import {loadOrCreateArtist} from "../../services/Artist.service";
import {recordCCBanned, recordCCDeployed, recordV4EditionDisabledUpdated} from "../../services/ActivityEvent.service";

// Index the deployment of the factory in order to capture the global V4 params
export function handleContractDeployed(event: ContractDeployed): void {
    log.info("KO V4 handleContractDeployed() found {}", [event.address.toHexString()]);
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
    log.info("KO V4 handleSelfSovereignERC721Deployed() - implementation {} deployed contract {}", [
        event.params.implementation.toHexString(),
        event.params.selfSovereignNFT.toHexString()
    ]);

    // Ignore all zero address implementations - pre-launch deployment before we set the registry address properly
    if (event.params.implementation.equals(ZERO_ADDRESS)) {
        return;
    }

    // Capture the contract global properties so the list of creator contracts can be fetched
    let creatorContractEntity = new CreatorContract(event.params.selfSovereignNFT.toHexString())
    let sovereignContractInstance = ERC721KODACreatorWithBuyItNow.bind(event.params.selfSovereignNFT)
    creatorContractEntity.blockNumber = event.block.number;
    creatorContractEntity.timestamp = event.block.timestamp;
    creatorContractEntity.transactionHash = event.transaction.hash;
    creatorContractEntity.transactionIndex = event.transaction.index;
    creatorContractEntity.logIndex = event.logIndex;
    creatorContractEntity.eventAddress = event.address;
    creatorContractEntity.eventTxFrom = event.transaction.from;
    creatorContractEntity.eventTxTo = event.transaction.to;
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

    creatorContractEntity.name = sovereignContractInstance.name()
    creatorContractEntity.symbol = sovereignContractInstance.symbol()

    const filterRegistry = sovereignContractInstance.try_operatorFilterRegistry()
    if (filterRegistry.reverted === false) {
        creatorContractEntity.filterRegistry = filterRegistry.value
    }

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
        defaultFundsShares.push(BigInt.fromString("10000000")) // TODO this is wrong <- it needs to read the default royalty amount from the mint EIP2981
    }

    creatorContractEntity.defaultFundsRecipients = defaultFundsRecipients
    creatorContractEntity.defaultFundsShares = defaultFundsShares

    creatorContractEntity.save()

    // Update the artist
    let artistEntity = loadOrCreateArtist(event.params.artist)
    let creatorContracts = artistEntity.creatorContracts
    if (!creatorContracts) creatorContracts = new Array<string>()
    creatorContracts.push(event.params.selfSovereignNFT.toHexString())
    artistEntity.creatorContracts = creatorContracts
    artistEntity.save()

    // Activity Event
    recordCCDeployed(event.params.selfSovereignNFT.toHexString(), event);
}

export function handleCreatorContractBanned(event: CreatorContractBanned): void {
    log.info("Calling handleCreatorContractBanned() call for contract {} which is banned {} ", [event.params._contract.toHexString(), event.params._banned.toString()]);

    let creatorContractEntity = CreatorContract.load(event.params._contract.toHexString())
    if (!creatorContractEntity) {
        // This could be called without a contract - handle it gracefully
        creatorContractEntity = new CreatorContract(event.params._contract.toHexString());
        creatorContractEntity.blockNumber = event.block.number;
        creatorContractEntity.timestamp = event.block.timestamp;
        creatorContractEntity.transactionHash = event.transaction.hash;
        creatorContractEntity.transactionIndex = event.transaction.index;
        creatorContractEntity.logIndex = event.logIndex;
        creatorContractEntity.eventAddress = event.address;
        creatorContractEntity.eventTxFrom = event.transaction.from;
        creatorContractEntity.eventTxTo = event.transaction.to;
        creatorContractEntity.implementation = DEAD_ADDRESS;
        creatorContractEntity.deployer = DEAD_ADDRESS;
        creatorContractEntity.creator = DEAD_ADDRESS;
        creatorContractEntity.owner = DEAD_ADDRESS;
        creatorContractEntity.minter = DEAD_ADDRESS;
        creatorContractEntity.defaultFundsHandler = DEAD_ADDRESS;
        creatorContractEntity.isBatchBuyItNow = true;
        creatorContractEntity.isHidden = true;
        creatorContractEntity.paused = true;
        creatorContractEntity.totalNumOfEditions = ZERO;
        creatorContractEntity.totalNumOfTokensSold = ZERO;
        creatorContractEntity.totalEthValueOfSales = ZERO_BIG_DECIMAL;
        creatorContractEntity.totalNumOfTransfers = ZERO;
        creatorContractEntity.editions = new Array<string>();
        creatorContractEntity.secondaryRoyaltyPercentage = ZERO;
        creatorContractEntity.defaultFundsRecipients = new Array<Bytes>();
        creatorContractEntity.defaultFundsShares = new Array<BigInt>();
        creatorContractEntity.save()
    }
    creatorContractEntity.isHidden = event.params._banned
    creatorContractEntity.save()

    recordCCBanned(event.params._contract.toHexString(), event);

    let editions = creatorContractEntity.editions

    for (let i: number = 0; i < editions.length; i++) {
        let edition = Edition.load(editions[i].toString())
        if (edition) {
            edition.active = !event.params._banned
            edition.save()

            recordV4EditionDisabledUpdated(event.params._contract.toHexString(), edition.id.toString(), event, edition)
        }
    }
}