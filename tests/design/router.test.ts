import { describe, expect, it } from "vitest";
import { match, paths } from "../../web/src/router";

describe("routes", () => {
  it("matches and decodes params, including incident IDs with ':' '&' and '/'", () => {
    expect(match("/case/:id", paths.case("26H1005"))).toEqual({ id: "26H1005" });
    expect(match("/incident/:id", paths.incident("basket_failure:H&E-BASKET-01"))).toEqual({ id: "basket_failure:H&E-BASKET-01" });
    expect(match("/incident/:id", paths.incident("protocol_mismatch:26H1004/A1"))).toEqual({ id: "protocol_mismatch:26H1004/A1" });
    expect(match("/station/:id", paths.station("processor-d"))).toEqual({ id: "processor-d" });
    expect(match("/case/:id", "/incidents")).toBeNull();
    expect(match("/", "/")).toEqual({});
  });
});
