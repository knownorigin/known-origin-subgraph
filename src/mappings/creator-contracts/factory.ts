import {
    SelfSovereignERC721Deployed
} from "../../../generated/KnownOriginV4Factory/KnownOriginV4Factory";

import {
    CreatorContract
} from "../../../generated/schema"

import {
    CreatorContract as CreatorContractTemplate
} from '../../../generated/templates';

export function handleSelfSovereignERC721Deployed(event: SelfSovereignERC721Deployed): void {
    // Capture the contract global properties so the list of creator contracts can be fetched
    let contract = new CreatorContract(event.params.selfSovereignNFT.toHexString())
    contract.deploymentBlockNumber = event.block.number
    contract.deploymentTimestamp = event.block.timestamp
    contract.implementation = event.params.implementation
    contract.deployer = event.params.deployer
    contract.creator = event.params.artist
    contract.defaultFundsHandler = event.params.fundsHandler
    contract.owner = event.params.artist
    contract.minter = event.params.artist
    contract.isHidden = false
    contract.save()

    // Inform the subgraph to index events from the creator contract
    CreatorContractTemplate.create(event.params.selfSovereignNFT)
}