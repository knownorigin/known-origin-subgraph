import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {Offer} from "../../generated/schema";
import {loadOrCreateEdition} from "./Edition.service";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {loadOrCreateCollector} from "./Collector.service";
import {toEther} from "../utils";
import {getArtistAddress} from "./AddressMapping.service";
import {loadOrCreateToken} from "./Token.service";

export const EDITION_TYPE = "Edition"
export const TOKEN_TYPE = "Token"

export const V1_CONTRACT = "1";
export const V2_CONTRACT = "2";

export function recordEditionOffer(block: ethereum.Block,
                                   transaction: ethereum.Transaction,
                                   contract: KnownOrigin,
                                   bidder: Address,
                                   amount: BigInt,
                                   editionNumber: BigInt): Offer {

    let editionEntity = loadOrCreateEdition(editionNumber, block, contract);
    editionEntity.save()

    let offer: Offer = initOffer(block, contract, EDITION_TYPE, editionNumber)
    offer.isActive = true
    offer.bidder = loadOrCreateCollector(bidder, block).id
    offer.ethValue = toEther(amount)
    offer.weiValue = amount
    // Artists own editions
    offer.currentOwner = loadOrCreateCollector(getArtistAddress(Address.fromString(editionEntity.artistAccount.toHexString())), block).id
    offer.timestamp = block.timestamp
    offer.transactionHash = transaction.hash
    offer.token = null
    offer.type = EDITION_TYPE

    offer.save()

    return offer as Offer
}

export function clearEditionOffer(block: ethereum.Block, contract: KnownOrigin, editionNumber: BigInt): Offer {
    let offer: Offer = initOffer(block, contract, EDITION_TYPE, editionNumber)
    offer.isActive = false
    offer.save();
    return offer as Offer
}

export function recordTokenOffer(block: ethereum.Block,
                                 transaction: ethereum.Transaction,
                                 contract: KnownOrigin,
                                 bidder: Address,
                                 amount: BigInt,
                                 tokenId: BigInt,
                                 secondaryMarketVersion: String): Offer {

    let tokenEntity = loadOrCreateToken(tokenId, contract, block);

    let offer: Offer = initOffer(block, contract, TOKEN_TYPE, tokenId)
    offer.isActive = true
    offer.bidder = loadOrCreateCollector(bidder, block).id
    offer.ethValue = toEther(amount)
    offer.weiValue = amount
    // Token holders own token
    offer.currentOwner = loadOrCreateCollector(Address.fromString(tokenEntity.currentOwner), block).id
    offer.timestamp = block.timestamp
    offer.transactionHash = transaction.hash
    offer.token = tokenEntity.id
    offer.type = TOKEN_TYPE
    offer.secondaryMarketVersion = secondaryMarketVersion

    offer.save()

    return offer as Offer
}

export function clearTokenOffer(block: ethereum.Block, contract: KnownOrigin, tokenId: BigInt): Offer {

    let offer: Offer = initOffer(block, contract, TOKEN_TYPE, tokenId)
    offer.isActive = false
    offer.save()

    return offer as Offer
}

export function updateTokenOfferOwner(block: ethereum.Block, contract: KnownOrigin, tokenId: BigInt, newOwner: Address): void {
    let offer: Offer | null = Offer.load(tokenId.toString());

    // Only do this is there is an offer object set
    if (offer !== null && offer.isActive) {
        let offer: Offer = initOffer(block, contract, TOKEN_TYPE, tokenId)
        offer.currentOwner = loadOrCreateCollector(Address.fromString(newOwner.toHexString()), block).id
        offer.save()
    }
}

export function initOffer(block: ethereum.Block, contract: KnownOrigin, type: String, id: BigInt): Offer {
    let offer: Offer | null = Offer.load(id.toString());
    if (offer == null) {
        offer = new Offer(id.toString());
        offer.type = type.toString()

        if (type == EDITION_TYPE) {
            offer.edition = loadOrCreateEdition(id, block, contract).id
        }

        if (type == TOKEN_TYPE) {
            let tokenEntity = loadOrCreateToken(id, contract, block);
            offer.edition = loadOrCreateEdition(tokenEntity.editionNumber, block, contract).id
            offer.token = tokenEntity.id
        }
    }

    return offer as Offer
}
