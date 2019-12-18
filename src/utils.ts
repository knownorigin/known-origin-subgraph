import {BigDecimal, BigInt, EthereumEvent, log} from "@graphprotocol/graph-ts/index";
import {DAY_ZERO, ONE_ETH, SECONDS_IN_DAY, ZERO} from "./constants";

export function toEther(value: BigInt): BigDecimal {
    return new BigDecimal(value) / ONE_ETH
}

export function dayNumberFromEvent(event: EthereumEvent): string {
    return event.block.timestamp
        .div(SECONDS_IN_DAY)
        .minus(DAY_ZERO)
        .toBigDecimal()
        .truncate(0)
        .toString()
}

class Civil {
    day: BigInt;
    month: BigInt;
    year: BigInt;
    dayOfYear: BigInt;

    constructor(day: BigInt, month: BigInt, year: BigInt, dayOfYear: BigInt) {
        this.day = day;
        this.month = month;
        this.year = year;
        this.dayOfYear = dayOfYear;
    }
}

export function civilFromEventTimestamp(event: EthereumEvent): Civil {
    let epoch: BigInt = event.block.timestamp;

    epoch = epoch + BigInt.fromI32(719468);
    let era: BigInt = (epoch >= ZERO ? epoch : epoch - BigInt.fromI32(146096)) / BigInt.fromI32(146097);
    //     const unsigned doe = static_cast<unsigned>(z - era * 146097);          // [0, 146096]
    let doe: BigInt = (epoch - era * BigInt.fromI32(146097));          // [0, 146096]
    //     const unsigned yoe = (doe - doe/1460 + doe/36524 - doe/146096) / 365;  // [0, 399]
    let yoe: BigInt = (doe - doe/BigInt.fromI32(1460) + doe/BigInt.fromI32(36524) - doe/BigInt.fromI32(146096)) / BigInt.fromI32(365);  // [0, 399]
    //const Int y = static_cast<Int>(yoe) + era * 400;
    let y: BigInt = yoe + era * BigInt.fromI32(400);
    let doy: BigInt = doe - (BigInt.fromI32(365)*yoe + yoe/BigInt.fromI32(4) - yoe/BigInt.fromI32(100));                // [0, 365]
    let mp = (BigInt.fromI32(5)*doy + BigInt.fromI32(2))/BigInt.fromI32(153);                                   // [0, 11]
    let d = doy - (BigInt.fromI32(153)*mp+BigInt.fromI32(2))/BigInt.fromI32(5) + BigInt.fromI32(1);                             // [1, 31]
    let m = mp + (mp < BigInt.fromI32(10) ? BigInt.fromI32(3) : BigInt.fromI32(-9));                            // [1, 12]

    //return std::tuple<Int, unsigned, unsigned>(y + (m <= 2), m, d);
    return new Civil(d, m, y, doy);
}

// template <class Int>
// constexpr
// std::tuple<Int, unsigned, unsigned>
// civil_from_days(Int z) noexcept
// {
//     static_assert(std::numeric_limits<unsigned>::digits >= 18,
//     "This algorithm has not been ported to a 16 bit unsigned integer");
//     static_assert(std::numeric_limits<Int>::digits >= 20,
//     "This algorithm has not been ported to a 16 bit signed integer");
//     z += 719468;
//     const Int era = (z >= 0 ? z : z - 146096) / 146097;
//     const unsigned doe = static_cast<unsigned>(z - era * 146097);          // [0, 146096]
//     const unsigned yoe = (doe - doe/1460 + doe/36524 - doe/146096) / 365;  // [0, 399]
//     const Int y = static_cast<Int>(yoe) + era * 400;
//     const unsigned doy = doe - (365*yoe + yoe/4 - yoe/100);                // [0, 365]
//     const unsigned mp = (5*doy + 2)/153;                                   // [0, 11]
//     const unsigned d = doy - (153*mp+2)/5 + 1;                             // [1, 31]
//     const unsigned m = mp + (mp < 10 ? 3 : -9);                            // [1, 12]
//     return std::tuple<Int, unsigned, unsigned>(y + (m <= 2), m, d);
// }
