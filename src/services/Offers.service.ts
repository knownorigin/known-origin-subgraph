import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {Offer} from "../../generated/schema";
import {loadOrCreateV2Edition} from "./Edition.service";
import {KnownOriginV2} from "../../generated/KnownOriginV2/KnownOriginV2";
import {loadOrCreateCollector} from "./Collector.service";
import {toEther} from "../utils";
import {getArtistAddress} from "./AddressMapping.service";
import {loadOrCreateV2Token} from "./Token.service";
import * as KodaVersions from "../KodaVersions";

export let EDITION_TYPE = "Edition"
export let TOKEN_TYPE = "Token"

export let V1_CONTRACT = "1";
export let V2_CONTRACT = "2";

export function recordEditionOffer(block: ethereum.Block,
                                   transaction: ethereum.Transaction,
                                   contract: KnownOriginV2,
                                   bidder: Address,
                                   amount: BigInt,
                                   editionNumber: BigInt): Offer {

    let editionEntity = loadOrCreateV2Edition(editionNumber, block, contract);
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

export function clearEditionOffer(block: ethereum.Block, contract: KnownOriginV2, editionNumber: BigInt): Offer {
    let offer: Offer = initOffer(block, contract, EDITION_TYPE, editionNumber)
    offer.isActive = false
    offer.save();
    return offer as Offer
}

export function recordTokenOffer(block: ethereum.Block,
                                 transaction: ethereum.Transaction,
                                 contract: KnownOriginV2,
                                 bidder: Address,
                                 amount: BigInt,
                                 tokenId: BigInt,
                                 secondaryMarketVersion: String): Offer {

    let tokenEntity = loadOrCreateV2Token(tokenId, contract, block);

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

    // FIXME Once all offers from V1 are removed, this fields can go - frontend switch also needs to be removed
    // @ts-ignore
    offer.secondaryMarketVersion = secondaryMarketVersion

    offer.save()

    return offer as Offer
}

export function clearTokenOffer(block: ethereum.Block, contract: KnownOriginV2, tokenId: BigInt):  void{
    let offer: Offer | null = Offer.load(tokenId.toString());
    if (offer !== null && offer.isActive) {
        offer.isActive = false
        offer.save()
    }
}

export function updateTokenOfferOwner(block: ethereum.Block, contract: KnownOriginV2, tokenId: BigInt, newOwner: Address): void {
    let offer: Offer | null = Offer.load(tokenId.toString());

    // Only do this is there is an offer object set
    if (offer !== null && offer.isActive) {
        let offer: Offer = initOffer(block, contract, TOKEN_TYPE, tokenId)
        offer.currentOwner = loadOrCreateCollector(Address.fromString(newOwner.toHexString()), block).id
        offer.save()
    }
}

export function initOffer(block: ethereum.Block, contract: KnownOriginV2, type: String, id: BigInt): Offer {
    let offer: Offer | null = Offer.load(id.toString());
    if (offer == null) {
        offer = new Offer(id.toString());
        offer.type = type.toString()
        offer.version = KodaVersions.KODA_V2

        if (type == EDITION_TYPE) {
            offer.edition = loadOrCreateV2Edition(id, block, contract).id
        }

        if (type == TOKEN_TYPE) {
            let tokenEntity = loadOrCreateV2Token(id, contract, block);
            offer.edition = loadOrCreateV2Edition(tokenEntity.editionNumber, block, contract).id
            offer.token = tokenEntity.id
        }
    }

    return offer as Offer
}
