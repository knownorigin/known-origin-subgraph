import {Address, BigDecimal, BigInt} from "@graphprotocol/graph-ts/index";
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
        artist.totalPrimarySales = ZERO
        artist.totalPrimarySalesInEth = new BigDecimal(ZERO)
        artist.totalSecondarySales = ZERO
        artist.totalSecondarySalesInEth = new BigDecimal(ZERO)
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

export function handleKodaV2CommissionSplit(contract: KnownOriginV2, editionNumber: BigInt, tokenId: BigInt, value: BigInt, isPrimarySale: boolean): void {
    let artistCommission = contract.artistCommission(editionNumber)
    let _optionalCommission = contract.try_editionOptionalCommission(editionNumber)
    if (!_optionalCommission.reverted && _optionalCommission.value.value0 > ZERO) {

        let collaborators = new Array<Address>();
        collaborators.push(artistCommission.value0)
        collaborators.push(_optionalCommission.value.value1)

        let splits = new Array<BigInt>();
        splits.push(artistCommission.value1)
        splits.push(_optionalCommission.value.value0)

        recordArtistCollaborationValue(collaborators, splits, tokenId, value, isPrimarySale)
    } else {
        recordArtistValue(artistCommission.value0, tokenId, value, isPrimarySale)
    }
}

export function recordArtistCollaborationValue(artistAddresses: Array<Address>, commissions: Array<BigInt>, tokenId: BigInt, value: BigInt, isPrimarySale: boolean): void {

    let totalCommissions: BigInt = commissions.reduce<BigInt>((previousValue: BigInt, currentValue: BigInt) => {
        return previousValue.plus(currentValue)
    }, ZERO)

    for (let i = 0; i < artistAddresses.length; i++) {
        let artistAddress = artistAddresses[i];
        let artistCommission = commissions[i];

        let totalSaleValue = value

        let saleAllocation = totalSaleValue
            .div(totalCommissions)
            .times(artistCommission)

        recordArtistValue(artistAddress, tokenId, saleAllocation, isPrimarySale)
    }
}

export function recordArtistValue(artistAddress: Address, tokenId: BigInt, value: BigInt, isPrimarySale: boolean): void {
    let artist = loadOrCreateArtist(artistAddress)

    artist.totalValueInEth = artist.totalValueInEth.plus(toEther(value))

    if (toEther(value) > artist.highestSaleValueInEth) {
        artist.highestSaleToken = tokenId.toString()
        artist.highestSaleValueInEth = toEther(value)
    }

    if (value > ZERO) {
        artist.salesCount = artist.salesCount.plus(ONE)
    }

    if (isPrimarySale) {
        artist.totalPrimarySales = artist.totalPrimarySales.plus(ONE)
        artist.totalPrimarySalesInEth = artist.totalPrimarySalesInEth.plus(toEther(value))
    } else {
        artist.totalSecondarySales = artist.totalSecondarySales.plus(ONE)
        artist.totalSecondarySalesInEth = artist.totalSecondarySalesInEth.plus(toEther(value))
    }

    artist.save()
}

export function recordArtistIssued(artistAddress: Address): void {
    let artist = loadOrCreateArtist(artistAddress)

    artist.issuedCount = artist.issuedCount.plus(ONE)

    artist.save()
}
