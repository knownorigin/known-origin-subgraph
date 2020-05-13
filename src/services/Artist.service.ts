import {Address, BigDecimal, BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {Artist} from "../../generated/schema";
import {ONE, ZERO} from "../constants";
import {toEther} from "../utils";
import {getArtistAddress} from "./AddressMapping.service";

export function loadOrCreateArtist(address: Address): Artist | null {
    let artistAddress = getArtistAddress(address);

    let artist: Artist | null = Artist.load(artistAddress.toHexString())

    if (artist === null) {
        artist = new Artist(artistAddress.toHexString())

        artist.address = artistAddress

        artist.editionsCount = ZERO

        artist.issuedCount = ZERO
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
    artist.editionsCount = artist.editionsCount.plus(ONE)
    artist.supply = artist.supply.plus(totalAvailable)

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

    artist.totalValueInEth = artist.totalValueInEth.plus(toEther(value))

    if (toEther(value) > artist.highestSaleValueInEth) {
        artist.highestSaleToken = tokenId.toString()
        artist.highestSaleValueInEth = toEther(value)
    }

    artist.save()
}

export function recordArtistCounts(artistAddress: Address, value: BigInt): void {
    let artist = loadOrCreateArtist(artistAddress)

    if (value > ZERO) {
        artist.salesCount = artist.salesCount.plus(ONE)
    }

    artist.save()
}

export function recordArtistIssued(artistAddress: Address): void {
    let artist = loadOrCreateArtist(artistAddress)

    artist.issuedCount = artist.issuedCount.plus(ONE)

    artist.save()
}
