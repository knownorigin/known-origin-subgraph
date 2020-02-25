import {Address} from "@graphprotocol/graph-ts/index";

export function getArtistAddress(address: Address): Address {

    /*
        Aktiv Protesk,"0xa2cD656f8461d2C186D69fFB8A4a5c10EFF0914d,0x7DEc37c03ea5ca2C47ad2509BE6abAf8C63CDB39"
        Rare Designer,"0x44c5E5bA251206cFB378dE443e70C4959562206d,0x43a7634Eb14C12B59bE599487c1d7898A3d864c1"
        Stan Ragets,"0x9155e2c7dB48d01d9dc419D1F18a088DeD25C009,0x96DEAD6149f580884410c873F6dA8d3DDE16F13C"
        hex6c,"0xf8b32D30aC6Ab3030595432533D7836FD76B078d,0x6F7fC56461F1Be9d430037f714AF67E641e5f6cF"
        CryptoKaiju,"0x7205A1B9C5cf6494ba2CEb5adCca831C05536912,0x7EdAbC5d4a3E1870b157caB79fAF5731389b07cF"
        Mattia Cuttini,"0x576a655161B5502dCf40602BE1f3519A89b71658,0xa2806aD7af94bb0645e493a8dE9CFF583c462717"
     */

    // Aktiv Protesk
    if (address.toHexString() === "0x7DEc37c03ea5ca2C47ad2509BE6abAf8C63CDB39") {
        return Address.fromString("0xa2cD656f8461d2C186D69fFB8A4a5c10EFF0914d");
    }

    // Rare designer
    if (address.toHexString() === "0x43a7634Eb14C12B59bE599487c1d7898A3d864c1") {
        return Address.fromString("0x44c5E5bA251206cFB378dE443e70C4959562206d");
    }

    // Stan Ragets
    if (address.toHexString() === "0x96DEAD6149f580884410c873F6dA8d3DDE16F13C") {
        return Address.fromString("0x9155e2c7dB48d01d9dc419D1F18a088DeD25C009");
    }

    // hex6c
    if (address.toHexString() === "0x6F7fC56461F1Be9d430037f714AF67E641e5f6cF") {
        return Address.fromString("0xf8b32D30aC6Ab3030595432533D7836FD76B078d");
    }

    // CryptoKaiju
    if (address.toHexString() === "0x7EdAbC5d4a3E1870b157caB79fAF5731389b07cF") {
        return Address.fromString("0x7205A1B9C5cf6494ba2CEb5adCca831C05536912");
    }

    // Mattia
    if (address.toHexString() === "0xa2806aD7af94bb0645e493a8dE9CFF583c462717") {
        return Address.fromString("0x576a655161B5502dCf40602BE1f3519A89b71658");
    }

    return address;
}
