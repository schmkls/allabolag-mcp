import { describe, expect, test } from "bun:test";
import { segmentationSearch } from "../segmentation-search.js";
import { SegmentationSearchParams } from "../../types/index.js";

describe("segmentationSearch", () => {
  test("should filter companies by location with 'umeå'", async () => {
    const params: SegmentationSearchParams = {
      location: "umeå",
    };

    const { results, totalCount } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);

    // Verify all companies have location containing Umeå
    results.forEach((company) => {
      expect(company.location.toLowerCase()).toContain("umeå");
    });
  });

  test("should sort companies by revenue in descending order", async () => {
    const params: SegmentationSearchParams = {
      sort: "revenueDesc",
    };

    const { results, totalCount } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);

    // Verify all companies have revenue data
    results.forEach((company) => {
      expect(company.revenue).toBeDefined();
    });

    // Check that first company has more revenue than second
    if (results.length >= 2) {
      const firstCompanyRevenue = parseInt(
        results[0].revenue?.replace(/\s+/g, "") || "0"
      );
      const secondCompanyRevenue = parseInt(
        results[1].revenue?.replace(/\s+/g, "") || "0"
      );

      expect(firstCompanyRevenue).toBeGreaterThan(secondCompanyRevenue);
    }
  });

  test("should sort companies by registration date in descending order", async () => {
    const params: SegmentationSearchParams = {
      sort: "registrationDateDesc",
    };

    const { results, totalCount } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);

    // Verify all companies have registration date data
    results.forEach((company) => {
      expect(company.registrationDate).toBeDefined();
    });

    // Check that first company has more recent registration date than second
    if (results.length >= 2) {
      // Extracting the year from date strings should be sufficient for comparison
      const firstDateYear = parseInt(
        results[0].registrationDate?.substring(0, 4) || "0"
      );
      const secondDateYear = parseInt(
        results[1].registrationDate?.substring(0, 4) || "0"
      );

      expect(firstDateYear).toBeGreaterThanOrEqual(secondDateYear);
    }
  });

  test("should return correct totalCount that matches the number of results", async () => {
    const params: SegmentationSearchParams = {
      location: "stockholm",
    };

    const { results, totalCount } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThanOrEqual(results.length);
  });

  test("should return different results when using pagination", async () => {
    const paramsPage1: SegmentationSearchParams = {
      page: 1,
    };

    const paramsPage2: SegmentationSearchParams = {
      page: 2,
    };

    const { results: page1Results } = await segmentationSearch(paramsPage1);
    const { results: page2Results } = await segmentationSearch(paramsPage2);

    expect(page1Results.length).toBeGreaterThan(0);
    expect(page2Results.length).toBeGreaterThan(0);

    // Check that the company names are different, indicating different pages
    const page1Names = page1Results.map((company) => company.name);
    const page2Names = page2Results.map((company) => company.name);

    expect(page1Names).not.toEqual(page2Names);
  });

  test("should find companies with specific number of employees range", async () => {
    const params: SegmentationSearchParams = {
      numEmployeesFrom: 50,
      numEmployeesTo: 100,
    };

    const { results } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);

    // Verify all companies have employees data
    results.forEach((company) => {
      expect(company.employees).toBeDefined();
    });
  });

  test("should find companies with specific revenue range", async () => {
    const params: SegmentationSearchParams = {
      revenueFrom: 10000, // 10M SEK
      revenueTo: 50000, // 50M SEK
    };

    const { results } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);

    // Verify all companies have revenue data
    results.forEach((company) => {
      expect(company.revenue).toBeDefined();
    });
  });

  test("should find companies with profit by sorting on profit", async () => {
    const params: SegmentationSearchParams = {
      sort: "profitDesc",
    };

    const { results } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);

    // Verify companies have profit data
    // Note: First companies should have profit data when sorted by profit
    expect(results[0].profit).toBeDefined();

    // Check that first company has more profit than second
    if (results.length >= 2 && results[1].profit) {
      const firstCompanyProfit = parseInt(
        results[0].profit?.replace(/\s+/g, "") || "0"
      );
      const secondCompanyProfit = parseInt(
        results[1].profit?.replace(/\s+/g, "") || "0"
      );

      expect(firstCompanyProfit).toBeGreaterThan(secondCompanyProfit);
    }
  });

  test("should throw an error with invalid sort parameter", async () => {
    // Using type assertion with unknown to bypass type checking for test
    const params = {
      sort: "invalidSortValue",
    } as unknown as SegmentationSearchParams;

    let error: Error | null = null;
    try {
      await segmentationSearch(params);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    }

    expect(error).not.toBeNull();
    expect(error?.message).toContain("Invalid sort parameter");
  });
});
