import { assert, describe, test } from "matchstick-as/assembly/index";
import { BigInt } from "@graphprotocol/graph-ts";
import { toEther } from "../../src/utils/utils";
import { BigDecimal } from "@graphprotocol/graph-ts/index";

describe("utils tests", () => {
  test("toEther()", () => {
    const ethValue = toEther(BigInt.fromString("1000000000000000000"));
    const expected = BigDecimal.fromString("1");
    assert.stringEquals(ethValue.toString(), expected.toString());
  });
});


test("Should throw an error", () => {
  throw new Error()
}, true)