import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts";
import {
    BuyNowPurchased,
    ListedEditionForBuyNow,
    EditionSalesDisabledUpdated,
    Transfer,
    OwnershipTransferred
} from "../../generated/KnownOriginV4Factory/ERC721KODACreatorWithBuyItNow";
import {newMockEvent} from "matchstick-as";
import {
    CreatorContractBanned,
    SelfSovereignERC721Deployed
} from "../../generated/KnownOriginV4Factory/KnownOriginV4Factory";

export function createTransferEvent(to: string, from: string, tokenId: BigInt): Transfer {
    let transferEvent = changetype<Transfer>(newMockEvent());
    transferEvent.parameters = new Array();
    transferEvent.parameters.push(new ethereum.EventParam("from", ethereum.Value.fromAddress(Address.fromString(from))));
    transferEvent.parameters.push(new ethereum.EventParam("to", ethereum.Value.fromAddress(Address.fromString(to))));
    transferEvent.parameters.push(new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)));
    return transferEvent;
}

export function createBuyNowPurchasedEvent(tokenId: BigInt, buyer: string, currentOwner: string, price: BigInt): BuyNowPurchased {
    let event = changetype<BuyNowPurchased>(newMockEvent());
    event.parameters = new Array();
    event.parameters.push(new ethereum.EventParam("tokenId", ethereum.Value.fromUnsignedBigInt(tokenId)));
    event.parameters.push(new ethereum.EventParam("buyer", ethereum.Value.fromAddress(Address.fromString(buyer))));
    event.parameters.push(new ethereum.EventParam("currentOwner", ethereum.Value.fromAddress(Address.fromString(currentOwner))));
    event.parameters.push(new ethereum.EventParam("price", ethereum.Value.fromUnsignedBigInt(price)));
    return event
}

export function createSelfSovereignERC721DeployedEvent(
    deployer: string,
    artist: string,
    selfSovereignNFT: string,
    implementation: string,
    fundsHandler: string
): SelfSovereignERC721Deployed {
    let transferEvent = changetype<SelfSovereignERC721Deployed>(newMockEvent());
    transferEvent.parameters = new Array();
    transferEvent.parameters.push(new ethereum.EventParam("deployer", ethereum.Value.fromAddress(Address.fromString(deployer))));
    transferEvent.parameters.push(new ethereum.EventParam("artist", ethereum.Value.fromAddress(Address.fromString(artist))));
    transferEvent.parameters.push(new ethereum.EventParam("selfSovereignNFT", ethereum.Value.fromAddress(Address.fromString(selfSovereignNFT))));
    transferEvent.parameters.push(new ethereum.EventParam("implementation", ethereum.Value.fromAddress(Address.fromString(implementation))));
    transferEvent.parameters.push(new ethereum.EventParam("fundsHandler", ethereum.Value.fromAddress(Address.fromString(fundsHandler))));
    return transferEvent;
}

export function createListedEditionForBuyNowEvent(editionId: BigInt, listingPrice: BigInt, startDate: BigInt): ListedEditionForBuyNow {
    let event = changetype<ListedEditionForBuyNow>(newMockEvent());
    event.parameters = new Array();
    event.parameters.push(new ethereum.EventParam("editionId", ethereum.Value.fromUnsignedBigInt(editionId)));
    event.parameters.push(new ethereum.EventParam("listingPrice", ethereum.Value.fromUnsignedBigInt(listingPrice)));
    event.parameters.push(new ethereum.EventParam("startDate", ethereum.Value.fromUnsignedBigInt(startDate)));

    return event
}

export function createCreatorContractBannedEvent(contract: string, banned: boolean): CreatorContractBanned {
    let event = changetype<CreatorContractBanned>(newMockEvent());
    event.parameters = new Array();

    event.parameters.push(new ethereum.EventParam("contract", ethereum.Value.fromAddress(Address.fromString(contract))));
    event.parameters.push(new ethereum.EventParam("banned", ethereum.Value.fromBoolean(banned)));

    return event
}

export function createEditionSalesDisabledUpdated(editionId: BigInt, disabled: boolean): EditionSalesDisabledUpdated {
    let event = changetype<EditionSalesDisabledUpdated>(newMockEvent());
    event.parameters = new Array();

    event.parameters.push(new ethereum.EventParam("editionId", ethereum.Value.fromUnsignedBigInt(editionId)));
    event.parameters.push(new ethereum.EventParam("disabled", ethereum.Value.fromBoolean(disabled)));

    return event
}

export function createOwnershipTransferEvent(previousOwner: string, newOwner: string): OwnershipTransferred {
    let event = changetype<OwnershipTransferred>(newMockEvent());
    event.parameters = new Array();

    event.parameters.push(new ethereum.EventParam("previousOwner", ethereum.Value.fromAddress(Address.fromString(previousOwner))));
    event.parameters.push(new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(Address.fromString(newOwner))));

    return event
}
