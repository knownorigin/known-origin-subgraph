import {Address, BigDecimal, BigInt} from "@graphprotocol/graph-ts/index";
import {Artist} from "../../generated/schema";
import {ONE, ZERO} from "../constants";

export function loadOrCreateArtist(address: Address): Artist | null {
    let artist: Artist | null = Artist.load(address.toHexString())

    if (artist === null) {
        artist = new Artist(address.toHexString())

        artist.address = address

        artist.editionCreationCount = ZERO
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