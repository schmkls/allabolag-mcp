import { describe, expect, test } from "bun:test";
import { segmentationSearch } from "../segmentation-search.js";

describe("segmentationSearch", () => {
  test("should fetch and count companies in Umeå with 0-10 employees", async () => {
    console.log("Starting segmentation search test...");

    const params = {
      location: "Umeå",
      numEmployeesFrom: 0,
      numEmployeesTo: 10,
    };

    try {
      console.log("Calling segmentationSearch with params:", params);
      const result = await segmentationSearch(params);

      console.log("Test received result:", {
        totalCount: result.totalCount,
        resultsCount: result.results.length,
      });

      // We expect to find over 10,000 companies based on the real data
      expect(result.totalCount).toBeGreaterThan(10000);
      console.log(`Total count is ${result.totalCount}`);

      expect(Array.isArray(result.results)).toBe(true);
      console.log(`Results is an array: ${Array.isArray(result.results)}`);

      expect(result.results.length).toBeGreaterThan(0);
      console.log(`Results length is ${result.results.length}`);

      if (result.results.length > 0) {
        console.log("First result:", result.results[0].name);
      }

      console.log("Test completed successfully!");
    } catch (error) {
      console.error("Test failed with error:", error);
      throw error; // Re-throw to fail the test
    }
  }, 30000); // 30 second timeout

  test("should fetch a specific page using the page parameter", async () => {
    console.log("Starting specific page test...");

    const params = {
      location: "Umeå",
      numEmployeesFrom: 0,
      numEmployeesTo: 10,
      page: 2,
    };

    try {
      // Fetch page 2 specifically
      console.log("Calling segmentationSearch with specific page 2");
      const result = await segmentationSearch(params);

      console.log("Test received result for page 2:", {
        totalCount: result.totalCount,
        resultsCount: result.results.length,
      });

      // We expect to find over 10,000 companies based on the real data
      expect(result.totalCount).toBeGreaterThan(10000);
      console.log(`Total count is ${result.totalCount}`);

      expect(Array.isArray(result.results)).toBe(true);
      console.log(`Results is an array: ${Array.isArray(result.results)}`);

      // Expect approximately 10 results per page
      expect(result.results.length).toBeGreaterThan(5);
      expect(result.results.length).toBeLessThanOrEqual(15);
      console.log(`Results length is ${result.results.length}`);

      if (result.results.length > 0) {
        console.log("First result on page 2:", result.results[0].name);
      }

      console.log("Specific page test completed successfully!");
    } catch (error) {
      console.error("Test failed with error:", error);
      throw error; // Re-throw to fail the test
    }
  }, 30000); // 30 second timeout
});
