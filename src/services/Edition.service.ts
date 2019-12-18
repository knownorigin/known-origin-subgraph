import {BigInt, EthereumBlock, log} from "@graphprotocol/graph-ts";
import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {Edition} from "../../generated/schema";
import {ZERO} from "../constants";
import {constructMetaData} from "./MetaData.service";

export function loadOrCreateEdition(editionNumber: BigInt, block: EthereumBlock, contract: KnownOrigin): Edition | null {
    let editionEntity: Edition | null = Edition.load(editionNumber.toString());

    if (editionEntity == null) {
        editionEntity = new Edition(editionNumber.toString());
        editionEntity.createdTimestamp = block.timestamp
        editionEntity.tokenIds = new Array<BigInt>()
        editionEntity.auctionEnabled = false
        editionEntity.activeBid = null
        editionEntity.biddingHistory = new Array<string>()

        let _editionData = contract.detailsOfEdition(editionNumber)

        editionEntity.createdTimestamp = ZERO
        editionEntity.editionData = _editionData.value0
        editionEntity.editionType = _editionData.value1
        editionEntity.startDate = _editionData.value2
        editionEntity.endDate = _editionData.value3
        editionEntity.artistAccount = _editionData.value4
        editionEntity.artistCommission = _editionData.value5
        editionEntity.priceInWei = _editionData.value6
        editionEntity.tokenURI = _editionData.value7
        editionEntity.totalSupply = _editionData.value8
        editionEntity.totalAvailable = _editionData.value9
        editionEntity.active = _editionData.value10

        let _optionalCommission = contract.editionOptionalCommission(editionNumber)
        if (_optionalCommission.value0 > ZERO) {
            editionEntity.optionalCommissionRate = _optionalCommission.value0
            editionEntity.optionalCommissionAccount = _optionalCommission.value1
        }

        let metaData = constructMetaData(_editionData.value7)
        metaData.save()
        editionEntity.metadata = metaData.id
    }

    return editionEntity;
}
