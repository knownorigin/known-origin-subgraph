import {BigDecimal, BigInt, EthereumEvent, log} from "@graphprotocol/graph-ts/index";
import {ONE_ETH, SECONDS_IN_DAY, ZERO, ONE} from "./constants";

export function toEther(value: BigInt): BigDecimal {
    return new BigDecimal(value) / ONE_ETH
}

class Civil {
    day: BigInt;
    month: BigInt;
    year: BigInt;

    constructor(day: BigInt, month: BigInt, year: BigInt) {
        this.day = day;
        this.month = month;
        this.year = year;
    }
}

export function civilFromEventTimestamp(event: EthereumEvent): Civil {
    let epoch: BigInt = event.block.timestamp;
    let z = epoch / SECONDS_IN_DAY;

    z = z + BigInt.fromI32(719468);
    let era: BigInt = (z >= ZERO ? z : z - BigInt.fromI32(146096)) / BigInt.fromI32(146097);
    let doe: BigInt = (z - era * BigInt.fromI32(146097));          // [0, 146096]
    let yoe: BigInt = (doe - doe/BigInt.fromI32(1460) + doe/BigInt.fromI32(36524) - doe/BigInt.fromI32(146096)) / BigInt.fromI32(365);  // [0, 399]
    let y: BigInt = yoe + (era * BigInt.fromI32(400));
    let doy: BigInt = doe - (BigInt.fromI32(365)*yoe + yoe/BigInt.fromI32(4) - yoe/BigInt.fromI32(100));                // [0, 365]
    let mp = (BigInt.fromI32(5)*doy + BigInt.fromI32(2))/BigInt.fromI32(153);                                   // [0, 11]
    let d = doy - (BigInt.fromI32(153)*mp+BigInt.fromI32(2))/BigInt.fromI32(5) + BigInt.fromI32(1);                             // [1, 31]
    let m = mp + (mp < BigInt.fromI32(10) ? BigInt.fromI32(3) : BigInt.fromI32(-9));                            // [1, 12]

    let year = m <= BigInt.fromI32(2) ? y + ONE : y;

    if (year.equals(BigInt.fromI32(2020))) {
        log.error("2020 is in the future!!", [])
    }

    return new Civil(d, m, year);
}
