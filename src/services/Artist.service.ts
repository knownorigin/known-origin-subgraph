import {Address, BigDecimal, BigInt, EthereumTransaction} from "@graphprotocol/graph-ts/index";
import {Artist} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {toEther} from "../utils";

export function loadOrCreateArtist(address: Address): Artist | null {
    let artist: Artist | null = Artist.load(address.toHexString())

    if (artist === null) {
        artist = new Artist(address.toHexString())

        artist.address = address

        artist.editionCreationCount = ZERO
        artist.issuedCount = ZERO
        artist.salesCount = ZERO
        artist.supply = ZERO

        artist.totalValue = ZERO
        artist.totalValueInEth = new BigDecimal(ZERO)

        artist.highestSaleValue = ZERO
        artist.highestSaleValueInEth = new BigDecimal(ZERO)

        artist.firstEditionTimestamp = ZERO
        artist.lastEditionTimestamp = ZERO
    }

    return artist;
}

export function addEditionToArtist(artistAddress: Address, editionNumber: string, totalAvailable: BigInt, created: BigInt): void {
    let artist = loadOrCreateArtist(artistAddress)
    artist.editionCreationCount = artist.editionCreationCount + ONE
    artist.supply = artist.supply + totalAvailable

    if (artist.firstEdition === null) {
        artist.firstEdition = editionNumber
        artist.firstEditionTimestamp = created
    }

    artist.lastEdition = editionNumber
    artist.lastEditionTimestamp = created

    artist.save()
}

export function addSaleTotalsToArtist(artistAddress: Address, tokenId: BigInt, eventTransaction: EthereumTransaction): Artist | null {
    let artist = loadOrCreateArtist(artistAddress)

    if (eventTransaction.value > ZERO) {
        artist.salesCount = artist.salesCount + ONE
    } else {
        artist.issuedCount = artist.issuedCount + ONE
    }

    artist.totalValue = artist.totalValue + eventTransaction.value
    artist.totalValueInEth = artist.totalValueInEth + toEther(eventTransaction.value)

    if (eventTransaction.value > artist.highestSaleValue) {
        artist.highestSaleToken = tokenId.toString()
        artist.highestSaleValue = eventTransaction.value
        artist.highestSaleValueInEth = toEther(eventTransaction.value)
    }

    artist.save()

    return artist
}
