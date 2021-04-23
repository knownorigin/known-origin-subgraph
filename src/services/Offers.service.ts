import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {Offer} from "../../generated/schema";
import {loadNonNullableEdition} from "./Edition.service";
import {loadOrCreateCollector} from "./Collector.service";
import {toEther} from "../utils";
import {getArtistAddress} from "./AddressMapping.service";
import {loadNonNullableToken} from "./Token.service";

export let EDITION_TYPE = "Edition"
export let TOKEN_TYPE = "Token"

export function recordEditionOffer(block: ethereum.Block,
                                   transaction: ethereum.Transaction,
                                   bidder: Address,
                                   amount: BigInt,
                                   editionNumber: BigInt): Offer {

    let editionEntity = loadNonNullableEdition(editionNumber);

    let offer: Offer = initOffer(block, EDITION_TYPE, editionNumber)
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

export function clearEditionOffer(block: ethereum.Block, editionNumber: BigInt): void {
    let offer: Offer | null = Offer.load(editionNumber.toString());
    if (offer !== null && offer.isActive) {
        offer.isActive = false
        offer.save()
    }
}

export function recordTokenOffer(block: ethereum.Block,
                                 transaction: ethereum.Transaction,
                                 bidder: Address,
                                 amount: BigInt,
                                 tokenId: BigInt,
                                 secondaryMarketVersion: String): Offer {

    let tokenEntity = loadNonNullableToken(tokenId);

    let offer: Offer = initOffer(block, TOKEN_TYPE, tokenId)
    offer.isActive = true
    offer.bidder = loadOrCreateCollector(bidder, block).id
    offer.ethValue = toEther(amount)
    offer.weiValue = amount

    // @ts-ignore
    // Token holders own token
    offer.currentOwner = loadOrCreateCollector(Address.fromString(tokenEntity.currentOwner), block).id
    offer.timestamp = block.timestamp
    offer.transactionHash = transaction.hash
    offer.token = tokenEntity.id
    offer.type = TOKEN_TYPE

    // FIXME Once all offers from V1 are removed, this fields can go - frontend switch also needs to be removed
    // @ts-ignore
    offer.secondaryMarketVersion = secondaryMarketVersion

    offer.save()

    return offer as Offer
}

export function clearTokenOffer(block: ethereum.Block, tokenId: BigInt): void {
    let offer: Offer | null = Offer.load(tokenId.toString());
    if (offer !== null && offer.isActive) {
        offer.isActive = false
        offer.save()
    }
}

export function updateTokenOfferOwner(block: ethereum.Block, tokenId: BigInt, newOwner: Address): void {
    let offer: Offer | null = Offer.load(tokenId.toString());

    // Only do this is there is an offer object set
    if (offer !== null && offer.isActive) {
        let offer: Offer = initOffer(block, TOKEN_TYPE, tokenId)
        offer.currentOwner = loadOrCreateCollector(Address.fromString(newOwner.toHexString()), block).id
        offer.save()
    }
}

function initOffer(block: ethereum.Block, type: String, id: BigInt): Offer {
    let offer: Offer | null = Offer.load(id.toString());
    if (offer == null) {

        // TODO how does this work when the edition and token ID are the same ID, we may need to add a composite ID of type and ID?
        offer = new Offer(id.toString());
        offer.type = type.toString()

        if (type == EDITION_TYPE) {
            let edition = loadNonNullableEdition(id);
            offer.edition = edition.id
            offer.version = edition.version
        }

        if (type == TOKEN_TYPE) {
            let tokenEntity = loadNonNullableToken(id);
            offer.edition = loadNonNullableEdition(tokenEntity.editionNumber).id
            offer.version = tokenEntity.version
            offer.token = tokenEntity.id
        }
    }

    return offer as Offer
}
