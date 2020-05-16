import {BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {KODA, Token} from "../../generated/schema";
import {ZERO, ZERO_ADDRESS, ZERO_BIG_DECIMAL} from "../constants";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {constructMetaData} from "./MetaData.service";
import {loadOrCreateCollector} from "./Collector.service";
import {getArtistAddress} from "./AddressMapping.service";

export function loadOrCreateToken(tokenId: BigInt, contract: KnownOrigin, block: ethereum.Block): Token | null {
    let tokenEntity = Token.load(tokenId.toString())

    if (tokenEntity == null) {
        let _tokenData = contract.tokenData(tokenId)
        tokenEntity = new Token(tokenId.toString())
        tokenEntity.transfers = new Array<string>()
        tokenEntity.allOwners = new Array<string>()
        tokenEntity.openOffer = null
        tokenEntity.tokenEvents = new Array<string>()

        // Entity fields can be set using simple assignments
        tokenEntity.transferCount = ZERO // set up the owner count
        tokenEntity.tokenId = tokenId
        tokenEntity.editionNumber = _tokenData.value0
        tokenEntity.tokenURI = _tokenData.value3

        let collector = loadOrCreateCollector(_tokenData.value4, block);
        collector.save();

        tokenEntity.currentOwner = collector.id

        tokenEntity.birthTimestamp = ZERO
        tokenEntity.lastTransferTimestamp = ZERO
        tokenEntity.primaryValueInEth = ZERO_BIG_DECIMAL
        tokenEntity.lastSalePriceInEth = ZERO_BIG_DECIMAL

        let metaData = constructMetaData(_tokenData.value3);
        metaData.save()
        tokenEntity.metadata = metaData.id

        tokenEntity.save();
    }

    return tokenEntity;
}

export function loadOrCreateTokenKODA(tokenId: BigInt, contract: KnownOrigin, block: ethereum.Block): KODA | null {
    let tokenKODAEntity = KODA.load(tokenId.toString())

    if (tokenKODAEntity == null) {
        // uint256 _editionNumber,
        //     uint256 _editionType,
        //     bytes32 _editionData,
        //     string _tokenURI,
        //     address _owner
        // let _tokenData = contract.tokenData(tokenId)
        tokenKODAEntity = new KODA(tokenId.toString())

        tokenKODAEntity.createdTimestamp = block.timestamp
        tokenKODAEntity.totalSupply = ZERO
        tokenKODAEntity.active = false
        tokenKODAEntity.edition = true
        tokenKODAEntity.name = null
        tokenKODAEntity.description = null
        tokenKODAEntity.image = null
        tokenKODAEntity.tagstring = null
        tokenKODAEntity.artist = null
        tokenKODAEntity.artistAccount = ZERO_ADDRESS
        tokenKODAEntity.priceInWei = ZERO

        // let metaData = constructMetaData(_tokenData.value3);
        // tokenKODAEntity.name = metaData.name
        // tokenKODAEntity.description = metaData.description
        // tokenKODAEntity.image = metaData.image
        // tokenKODAEntity.artist = metaData.artist
        // tokenKODAEntity.tagstring = metaData.tags.toString()

        // from edition
        // tokenKODAEntity.artistAccount = getArtistAddress(_editionData.value4)
        // editionKODAEntity.totalSupply = _editionData.value8
        // editionKODAEntity.active = _editionData.value10

        // TODO load in edition stuff


        tokenKODAEntity.save();
    }

    return tokenKODAEntity;
}
