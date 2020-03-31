import {KnownOrigin} from "../../generated/KnownOrigin/KnownOrigin";
import {Address} from "@graphprotocol/graph-ts/index";
import {KODA_MAINNET, KODA_RINKEBY} from "../constants";

export function getKnownOriginForAddress(address: Address): KnownOrigin {

    let mainnetAddresses = new Array<Address>();
    mainnetAddresses.push(Address.fromString("0xdde2d979e8d39bb8416eafcfc1758f3cab2c9c72"))
    mainnetAddresses.push(Address.fromString("0xfbeef911dc5821886e1dda71586d90ed28174b7d"))
    mainnetAddresses.push(Address.fromString("0x921ade9018Eec4a01e41e80a7eeBa982B61724Ec"))
    mainnetAddresses.push(Address.fromString("0x848b0ea643e5a352d78e2c0c12a2dd8c96fec639"))

    // Mainnet addresses - FIXME - is there a better way?
    if (mainnetAddresses.indexOf(address) > -1) {
        return KnownOrigin.bind(Address.fromString(KODA_MAINNET))
    }
    return KnownOrigin.bind(Address.fromString(KODA_RINKEBY))
}
