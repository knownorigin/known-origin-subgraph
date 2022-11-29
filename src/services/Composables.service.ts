import {KnownOriginV3} from "../../generated/KnownOriginV3/KnownOriginV3";
import {loadNonNullableToken} from "./Token.service";
import {loadNonNullableEdition} from "./Edition.service";
import {ZERO} from "../utils/constants";
import {BigInt} from "@graphprotocol/graph-ts/index";


export function determineIfEditionIsEnhanced(koda: KnownOriginV3, triggerTokenId: BigInt): boolean {

    let token = loadNonNullableToken(triggerTokenId.toString())
    let edition = loadNonNullableEdition(token.editionNumber)

    // Quick exit - does the token have another NFT inside of it
    let results = koda.try_kodaTokenComposedNFT(triggerTokenId)
    if (!results.reverted && results.value.value1.gt(ZERO)) {
        return true
    }

    let tokenIds = edition.tokenIds;
    for (let i = 0; i < tokenIds.length; i++) {
        let tokenId = tokenIds[i]

        // Check token has NFT inside
        let results = koda.try_kodaTokenComposedNFT(BigInt.fromString(tokenId))
        if (!results.reverted && results.value.value1.gt(ZERO)) {
            return true
        }

        // Get all possible embedded token contracts
        let contracts = koda.try_totalERC20Contracts(BigInt.fromString(tokenId))
        if (!contracts.reverted) {
            for (let t = ZERO; t < contracts.value;) {

                // Get associated token balance for contract
                let tokenContract = koda.try_erc20ContractByIndex(BigInt.fromString(tokenId), t);
                if (!tokenContract.reverted) {

                    // Get and check balance > zero signifying its enhanced
                    let balance = koda.try_balanceOfERC20(BigInt.fromString(tokenId), tokenContract.value)
                    if (!balance.reverted) {
                        if (balance.value.gt(ZERO)) {
                            return true;
                        }
                    }
                }
                t = t.plus(BigInt.fromI32(1))
            }
        }
    }

    return false;
}
