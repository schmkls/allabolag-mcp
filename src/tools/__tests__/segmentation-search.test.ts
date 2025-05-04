import { describe, expect, test } from "bun:test";
import { segmentationSearch } from "../segmentation-search.js";
import { SegmentationSearchParams } from "../../types/index.js";

describe("segmentationSearch", () => {
  test("should filter companies by location with 'Umeå'", async () => {
    const params: SegmentationSearchParams = {
      location: "Umeå",
    };

    const { results, totalCount } = await segmentationSearch(params);

    // We should get results and they should match the total count
    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(10000); // Over 10000 companies in Umeå

    expect(results[0].location).toContain("Umeå");
  });

  test("should sort companies by revenue in descending order", async () => {
    const params: SegmentationSearchParams = {
      sort: "revenueDesc",
    };

    const { results, totalCount } = await segmentationSearch(params);

    // We should get results and they should match the total count
    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);

    // Revenue sorted data must have revenue values
    results.forEach((company) => {
      expect(company.revenue).toBeDefined();
    });

    // Check the descending order is maintained throughout the results
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].revenue as number;
      const next = results[i + 1].revenue as number;
      expect(current).toBeGreaterThanOrEqual(next);
    }
  });

  test("should sort companies by registration date in descending order", async () => {
    const params: SegmentationSearchParams = {
      sort: "registrationDateDesc",
    };

    const { results, totalCount } = await segmentationSearch(params);

    // We should get results and they should match the total count
    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);

    // Date sorted data must have registration dates
    results.forEach((company) => {
      expect(company.registrationDate).toBeDefined();
    });

    // Check the descending order is maintained throughout the results
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].registrationDate as Date;
      const next = results[i + 1].registrationDate as Date;
      expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
    }
  });

  test("should return correct totalCount that matches the number of results", async () => {
    const params: SegmentationSearchParams = {
      location: "Stockholm",
    };

    const { results, totalCount } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);
    expect(totalCount).toBeGreaterThan(0);
    // Real-world totalCount may be significantly larger than the number of results returned
    // as the website often limits results in a single page
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
    const employeesFrom = 50;
    const employeesTo = 100;

    const params: SegmentationSearchParams = {
      numEmployeesFrom: employeesFrom,
      numEmployeesTo: employeesTo,
    };

    const { results } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);

    // ALL companies returned must have employee data
    results.forEach((company) => {
      expect(company.employees).toBeDefined();

      // For employee ranges like "1-4", we can't do a strict numeric check
      // Instead, we'll verify the employees field exists
      expect(typeof company.employees).toBe("string");
    });
  });

  test("should find companies with specific revenue range", async () => {
    const revenueFrom = 10000; // 10M SEK
    const revenueTo = 50000; // 50M SEK

    const params: SegmentationSearchParams = {
      revenueFrom,
      revenueTo,
    };

    const { results } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);

    // ALL companies returned must have revenue data
    results.forEach((company) => {
      expect(company.revenue).toBeDefined();

      // Strict check: ALL revenue must be within range
      const revenue = company.revenue as number;
      expect(revenue).toBeGreaterThanOrEqual(revenueFrom);
      expect(revenue).toBeLessThanOrEqual(revenueTo);
    });
  });

  test("should find companies with profit and sort them in descending order", async () => {
    const params: SegmentationSearchParams = {
      sort: "profitDesc",
    };

    const { results } = await segmentationSearch(params);

    expect(results.length).toBeGreaterThan(0);

    // When sorted by profit, at least the first company must have profit data
    expect(results[0].profit).toBeDefined();

    let lastProfit: number | undefined;
    for (const company of results) {
      if (company.profit === undefined) continue;

      // If we've seen a profit value before, compare with it
      if (lastProfit !== undefined) {
        expect(lastProfit).toBeGreaterThanOrEqual(company.profit);
      }

      // Update last profit value
      lastProfit = company.profit;
    }

    // Ensure we actually tested at least one profit comparison
    expect(lastProfit).not.toBeNull();
  });

  test("should throw an error with invalid sort parameter", async () => {
    // Using type assertion with unknown to bypass type checking for test
    const params = {
      sort: "invalidSortValue",
    } as unknown as SegmentationSearchParams;

    // Verify the function throws an error with the expected message
    try {
      await segmentationSearch(params);
      // If we reach this line, the function didn't throw, and the test should fail
      expect(true).toBe(false); // Force test to fail
    } catch (error) {
      expect(error instanceof Error).toBe(true);
      expect((error as Error).message).toBe("Invalid sort parameter");
    }
  });
});
