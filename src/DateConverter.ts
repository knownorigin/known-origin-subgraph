import {BigInt, EthereumEvent} from "@graphprotocol/graph-ts/index";
import {ONE, SECONDS_IN_DAY, ZERO} from "./constants";
import {toBigInt} from "./TypeConverterUtils";

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

// Ported from http://howardhinnant.github.io/date_algorithms.html#civil_from_days
export function civilFromEventTimestamp(event: EthereumEvent): Civil {
    let epoch: BigInt = event.block.timestamp;
    let z = epoch / SECONDS_IN_DAY;

    z = z + toBigInt(719468);
    let era: BigInt = (z >= ZERO ? z : z - toBigInt(146096)) / toBigInt(146097);
    let doe: BigInt = (z - era * toBigInt(146097));          // [0, 146096]
    let yoe: BigInt = (doe - doe/toBigInt(1460) + doe/toBigInt(36524) - doe/toBigInt(146096)) / toBigInt(365);  // [0, 399]
    let y: BigInt = yoe + (era * toBigInt(400));
    let doy: BigInt = doe - (toBigInt(365)*yoe + yoe/toBigInt(4) - yoe/toBigInt(100));                // [0, 365]
    let mp = (toBigInt(5)*doy + toBigInt(2))/toBigInt(153);                                   // [0, 11]
    let d = doy - (toBigInt(153)*mp+toBigInt(2))/toBigInt(5) + toBigInt(1);                             // [1, 31]
    let m = mp + (mp < toBigInt(10) ? toBigInt(3) : toBigInt(-9));                            // [1, 12]

    let year = m <= toBigInt(2) ? y + ONE : y;

    return new Civil(d, m, year);
}