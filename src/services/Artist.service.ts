import {Address, BigDecimal, BigInt, EthereumTransaction} from "@graphprotocol/graph-ts/index";
import {Artist} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {toEther} from "../utils";

export function loadOrCreateArtist(address: Address): Artist | null {
    let artist: Artist | null = Artist.load(address.toHexString())

    if (artist === null) {
        artist = new Artist(address.toHexString())

        artist.address = address

        artist.editionsCount = ZERO
        artist.giftsCount = ZERO
        artist.salesCount = ZERO
        artist.supply = ZERO

        artist.totalValueInEth = new BigDecimal(ZERO)

        artist.highestSaleValueInEth = new BigDecimal(ZERO)

        artist.firstEditionTimestamp = ZERO
        artist.lastEditionTimestamp = ZERO
    }

    return artist;
}

export function addEditionToArtist(artistAddress: Address, editionNumber: string, totalAvailable: BigInt, created: BigInt): void {
    let artist = loadOrCreateArtist(artistAddress)
    artist.editionsCount = artist.editionsCount + ONE
    artist.supply = artist.supply + totalAvailable

    if (artist.firstEdition === null) {
        artist.firstEdition = editionNumber
        artist.firstEditionTimestamp = created
    }

    artist.lastEdition = editionNumber
    artist.lastEditionTimestamp = created

    artist.save()
}

export function recordArtistValue(artistAddress: Address, tokenId: BigInt, value: BigInt): void {
    let artist = loadOrCreateArtist(artistAddress)

    artist.totalValueInEth = artist.totalValueInEth + toEther(value)

    if (toEther(value) > artist.highestSaleValueInEth) {
        artist.highestSaleToken = tokenId.toString()
        artist.highestSaleValueInEth = toEther(value)
    }

    artist.save()
}

export function recordArtistCounts(artistAddress: Address, eventTransaction: EthereumTransaction): void {
    let artist = loadOrCreateArtist(artistAddress)

    if (eventTransaction.value > ZERO) {
        artist.salesCount = artist.salesCount + ONE
    } else {
        artist.giftsCount = artist.giftsCount + ONE
    }

    artist.save()
}
