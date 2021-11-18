import {Address, BigDecimal, BigInt, Bytes} from "@graphprotocol/graph-ts/index";
import {Artist, ArtistMintingConfig} from "../../generated/schema";
import {ONE, ZERO} from "../utils/constants";
import {toEther} from "../utils/utils";
import {getArtistAddress} from "./AddressMapping.service";
import {KnownOriginV2} from "../../generated/KnownOriginV2/KnownOriginV2";

export function loadOrCreateArtist(address: Address): Artist {
    let artistAddress = getArtistAddress(address);

    let artist = Artist.load(artistAddress.toHexString())

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

        let mintConfig = new ArtistMintingConfig(artistAddress.toHexString())
        mintConfig.mints = ZERO;
        mintConfig.firstMintInPeriod = ZERO;
        mintConfig.frequencyOverride = false;
        mintConfig.save()

        artist.mintingConfig = mintConfig.id
    }

    return artist as Artist;
}

export function addEditionToArtist(artistAddress: Address, editionNumber: string, totalAvailable: BigInt, created: BigInt): Artist {
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

    return artist
}

export function handleKodaV2CommissionSplit(contract: KnownOriginV2, editionNumber: BigInt, tokenId: BigInt, value: BigInt): void {
    let artistCommission = contract.artistCommission(editionNumber)
    let _optionalCommission = contract.try_editionOptionalCommission(editionNumber)
    if (!_optionalCommission.reverted && _optionalCommission.value.value0 > ZERO) {
        recordArtistCollaborationValue(
            [artistCommission.value0, _optionalCommission.value.value1],
            [artistCommission.value1, _optionalCommission.value.value0],
            tokenId,
            value
        )
    } else {
        recordArtistValue(artistCommission.value0, tokenId, value)
    }
}

export function recordArtistCollaborationValue(artistAddresses: Array<Bytes>, commissions: Array<BigInt>, tokenId: BigInt, value: BigInt): void {

    let totalCommissions: BigInt = commissions.reduce<BigInt>((previousValue: BigInt, currentValue: BigInt) => {
        return previousValue.plus(currentValue)
    }, ZERO)

    for (let i = 0; i < artistAddresses.length; i++) {
        let artistAddress = artistAddresses[i];
        let artistCommission = commissions[i];

        let totalSaleValue = BigInt.fromI32(value.toI32())

        let saleAllocation = totalSaleValue
            .div(totalCommissions)
            .times(artistCommission)

        recordArtistValue(Address.fromString(artistAddress.toHexString()), tokenId, saleAllocation)
    }
}

export function recordArtistValue(artistAddress: Address, tokenId: BigInt, value: BigInt): void {
    let artist = loadOrCreateArtist(artistAddress)

    artist.totalValueInEth = artist.totalValueInEth.plus(toEther(value))

    if (toEther(value) > artist.highestSaleValueInEth) {
        artist.highestSaleToken = tokenId.toString()
        artist.highestSaleValueInEth = toEther(value)
    }

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
