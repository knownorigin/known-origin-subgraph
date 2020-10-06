import {Address} from "@graphprotocol/graph-ts/index";
import {log} from "@graphprotocol/graph-ts";

export function getArtistAddress(address: Address): Address {

    /*
        Aktiv Protesk,"0xa2cD656f8461d2C186D69fFB8A4a5c10EFF0914d,0x7DEc37c03ea5ca2C47ad2509BE6abAf8C63CDB39"
        Rare Designer,"0x44c5E5bA251206cFB378dE443e70C4959562206d,0x43a7634Eb14C12B59bE599487c1d7898A3d864c1"
        Rare Designer,"0x43a7634Eb14C12B59bE599487c1d7898A3d864c1,0xfe5b7200b2b63be7dc7281e7b4ae9955e34d986c"
        Stan Ragets,"0x9155e2c7dB48d01d9dc419D1F18a088DeD25C009,0x96DEAD6149f580884410c873F6dA8d3DDE16F13C"
        hex6c,"0xf8b32D30aC6Ab3030595432533D7836FD76B078d,0x6F7fC56461F1Be9d430037f714AF67E641e5f6cF"
        CryptoKaiju,"0x7205A1B9C5cf6494ba2CEb5adCca831C05536912,0x7EdAbC5d4a3E1870b157caB79fAF5731389b07cF"
        Mattia Cuttini,"0x576a655161B5502dCf40602BE1f3519A89b71658,0xa2806aD7af94bb0645e493a8dE9CFF583c462717"
     */

    // Aktiv Protesk
    if (address.equals(Address.fromString("0x7DEc37c03ea5ca2C47ad2509BE6abAf8C63CDB39"))) {
        log.info("Replacing address {} with {}", [
            "0x7DEc37c03ea5ca2C47ad2509BE6abAf8C63CDB39", "0xa2cD656f8461d2C186D69fFB8A4a5c10EFF0914d"
        ]);
        return Address.fromString("0xa2cD656f8461d2C186D69fFB8A4a5c10EFF0914d");
    }

    // Rare designer
    if (
        // (first replacement)
        address.equals(Address.fromString("0x43a7634Eb14C12B59bE599487c1d7898A3d864c1"))
        // (second replacement)
        || address.equals(Address.fromString("0x44c5E5bA251206cFB378dE443e70C4959562206d"))
    ) {
        log.info("Replacing address {} with {} ", [
            address.toHexString(), "0xfe5b7200b2b63be7dc7281e7b4ae9955e34d986c"
        ]);
        return Address.fromString("0xfe5b7200b2b63be7dc7281e7b4ae9955e34d986c");
    }

    // Stan Ragets
    if (address.equals(Address.fromString("0x96DEAD6149f580884410c873F6dA8d3DDE16F13C"))) {
        log.info("Replacing address {} with {}", [
            "0x96DEAD6149f580884410c873F6dA8d3DDE16F13C", "0x9155e2c7dB48d01d9dc419D1F18a088DeD25C009"
        ]);
        return Address.fromString("0x9155e2c7dB48d01d9dc419D1F18a088DeD25C009");
    }

    // hex6c
    if (address.equals(Address.fromString("0x6F7fC56461F1Be9d430037f714AF67E641e5f6cF"))) {
        log.info("Replacing address {} with {}", [
            "0x6F7fC56461F1Be9d430037f714AF67E641e5f6cF", "0xf8b32D30aC6Ab3030595432533D7836FD76B078d"
        ]);
        return Address.fromString("0xf8b32D30aC6Ab3030595432533D7836FD76B078d");
    }

    // CryptoKaiju
    if (address.equals(Address.fromString("0x7EdAbC5d4a3E1870b157caB79fAF5731389b07cF"))) {
        log.info("Replacing address {} with {}", [
            "0x7EdAbC5d4a3E1870b157caB79fAF5731389b07cF", "0x7205A1B9C5cf6494ba2CEb5adCca831C05536912"
        ]);
        return Address.fromString("0x7205A1B9C5cf6494ba2CEb5adCca831C05536912");
    }

    // Mattia
    if (address.equals(Address.fromString("0xa2806aD7af94bb0645e493a8dE9CFF583c462717"))) {
        log.info("Replacing address {} with {}", [
            "0xa2806aD7af94bb0645e493a8dE9CFF583c462717", "0x576a655161B5502dCf40602BE1f3519A89b71658"
        ]);
        return Address.fromString("0x576a655161B5502dCf40602BE1f3519A89b71658");
    }

    // ArtByMlo
    if (address.equals(Address.fromString("0xe0f228070d8f7b5c25e9375fa70fa418f8dfedf8"))) {
        log.info("Replacing address {} with {}", [
            "0xe0f228070d8f7b5c25e9375fa70fa418f8dfedf8", "0xCed2662Fe30D876bEf52F219eeAC67e2b328Effc"
        ]);
        return Address.fromString("0xCed2662Fe30D876bEf52F219eeAC67e2b328Effc");
    }

    return address;
}
