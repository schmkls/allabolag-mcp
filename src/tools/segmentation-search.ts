import * as cheerio from "cheerio";
import { logger } from "../logger.js";
import { fetchPage } from "../lib/scraping.js";
import {
  SegmentationSearchParams,
  SegmentationSearchResult,
} from "../types/index.js";

/**
 * Search for companies on Allabolag.se using segmentation criteria
 *
 * @param params - The search parameters for segmentation (location, employees, revenue, etc.)
 * @returns An object containing the results array and the total count of companies
 */
export async function segmentationSearch(
  params: SegmentationSearchParams
): Promise<{ results: SegmentationSearchResult[]; totalCount: number }> {
  try {
    // Build the URL with query parameters
    const queryParams = new URLSearchParams();

    if (params.proffIndustryCode) {
      queryParams.set("proffIndustryCode", params.proffIndustryCode);
    }
    if (params.location) {
      queryParams.set("location", params.location);
    }
    if (params.companyType) {
      queryParams.set("companyType", params.companyType);
    }
    if (params.revenueFrom !== undefined) {
      queryParams.set("revenueFrom", params.revenueFrom.toString());
    }
    if (params.revenueTo !== undefined) {
      queryParams.set("revenueTo", params.revenueTo.toString());
    }
    if (params.numEmployeesFrom !== undefined) {
      queryParams.set("numEmployeesFrom", params.numEmployeesFrom.toString());
    }
    if (params.numEmployeesTo !== undefined) {
      queryParams.set("numEmployeesTo", params.numEmployeesTo.toString());
    }
    if (params.sort) {
      queryParams.set("sort", params.sort);
    }

    // Set the requested page (default to 1 if not provided)
    const page = params.page || 1;
    queryParams.set("page", page.toString());

    const url = `https://www.allabolag.se/segmentering?${queryParams.toString()}`;
    logger.log(`Fetching segmentation search page ${page} with URL:`, url);

    const { results, count } = await fetchAndProcessPage(url);

    logger.log("Total segmentation results fetched:", results.length);
    logger.log("Total count from website:", count);

    // Return both the results and the total count
    return {
      results,
      totalCount: count,
    };
  } catch (error) {
    logger.log("Error in segmentation search:", error);
    throw new Error("Failed to perform segmentation search");
  }
}

/**
 * Fetches and processes a single page of segmentation search results
 *
 * @param url - The full URL to fetch, including all query parameters
 * @returns Object containing the page results, total count, and total pages
 */
async function fetchAndProcessPage(url: string): Promise<{
  results: SegmentationSearchResult[];
  count: number;
  pages: number;
}> {
  const data = await fetchPage(url);
  const $ = cheerio.load(data);
  const pageResults: SegmentationSearchResult[] = [];
  let totalCount = 0;
  let totalPages = 1;

  // Extract the total count of companies directly from the heading
  const totalCountHeading = $("main h2")
    .filter(function (this: cheerio.Element) {
      return $(this).text().includes("företag");
    })
    .first();

  if (totalCountHeading.length) {
    const countText = totalCountHeading.text().trim();
    const countMatch = countText.match(/(\d+\s*\d*)\s+företag/);
    if (countMatch && countMatch[1]) {
      // Remove any spaces in the number (e.g. "13 170" -> "13170")
      totalCount = parseInt(countMatch[1].replace(/\s+/g, ""), 10);
    }
  }

  // Calculate the total pages - Allabolag shows 10 companies per page
  totalPages = Math.max(1, Math.ceil(totalCount / 10));

  // Find all company cards by looking for h2 headings containing links
  $("main h2").each((_, element) => {
    const companyLink = $(element).find("a").first();
    if (!companyLink.length) return; // Skip non-company headers

    try {
      // Extract company name from heading
      const name = companyLink.text().trim();

      // Skip if this is the "total count" header or other non-company headers
      if (
        name.includes("företag") ||
        name === "Köp denna lista" ||
        name === "Allabolag PLUS"
      ) {
        return;
      }

      // Extract link
      const link = companyLink.attr("href") || "";

      // Get the company container - either the closest Grid root or parent element
      const companyContainer = $(element).parent();

      // Extract organization number
      const orgNumberEl = companyContainer.find(":contains('Org.nr')").first();
      let orgNumber = "";
      if (orgNumberEl.length) {
        const orgNumberParent = orgNumberEl.parent();
        orgNumber = orgNumberParent.text().replace("Org.nr", "").trim();
      }

      // Extract location (usually follows org number)
      let location = "";
      const nextElement = orgNumberEl.parent().next();
      if (nextElement.length) {
        const text = nextElement.text().trim();
        if (!text.includes("Anställda") && !text.includes("Omsättning")) {
          location = text;
        }
      }

      // Extract revenue with year
      const revenueElParent = companyContainer
        .find(":contains('Omsättning')")
        .first()
        .parent();
      let revenue = "";
      let revenueYear = "";
      if (revenueElParent.length) {
        const revenueFull = revenueElParent.text().trim();
        const revenueMatch = revenueFull.match(
          /Omsättning\s+(\d{4})\s+([\d\s]+)/
        );
        if (revenueMatch) {
          revenueYear = revenueMatch[1];
          revenue = revenueMatch[2].trim();
        } else {
          const altMatch = revenueFull.match(/Omsättning\s+([\d\s]+)/);
          if (altMatch) {
            revenue = altMatch[1].trim();
          }
        }
      }

      // Extract employees
      const employeesElParent = companyContainer
        .find(":contains('Anställda')")
        .first()
        .parent();
      let employees = "";
      if (employeesElParent.length) {
        employees = employeesElParent.text().replace("Anställda", "").trim();
      }

      // Extract registration date
      const regDateElParent = companyContainer
        .find(":contains('Registrerad datum')")
        .first()
        .parent();
      let registrationDate = "";
      if (regDateElParent.length) {
        registrationDate = regDateElParent
          .text()
          .replace("Registrerad datum fallande", "")
          .trim();
      }

      // Extract industry links
      const industryLinks = companyContainer.find("a[href*='bransch']");
      const industry: string[] = [];
      industryLinks.each((_, link) => {
        const industryText = $(link).text().trim();
        if (industryText) {
          industry.push(industryText);
        }
      });

      // Only add if we have at least a name and link
      if (name && link) {
        pageResults.push({
          name,
          orgNumber,
          location,
          link,
          revenue: revenue || undefined,
          revenueYear: revenueYear || undefined,
          employees: employees || undefined,
          registrationDate: registrationDate || undefined,
          industry: industry.length > 0 ? industry : undefined,
        });
      }
    } catch (err) {
      logger.log("Error parsing company element:", err);
    }
  });

  return {
    results: pageResults,
    count: totalCount,
    pages: totalPages,
  };
}
