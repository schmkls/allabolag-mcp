import { describe, expect, test } from "bun:test";
import { getCompanyInfo } from "../src/scraper.js";

describe("getCompanyInfo", () => {
  test("should fetch and parse Fortnox company information correctly", async () => {
    const path = "/foretag/fortnox-aktiebolag/35246/affärssystem/2K12R4ZI5YCR3";
    const info = await getCompanyInfo(path);

    expect(info.name).toBe("Fortnox Aktiebolag");
    expect(info.orgNumber).toBe("556469-6291");
    expect(info.location).toBeDefined();
    expect(info.status).toBe("Active");
  });
});
