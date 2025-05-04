import * as cheerio from "cheerio";
import { logger } from "../logger.js";
import { fetchPage } from "../lib/scraping.js";
import {
  SegmentationSearchParams,
  SegmentationSearchResult,
  SegmentationSearchResponse,
} from "../types/index.js";

/**
 * Build a URL for the segmentation search based on the provided parameters
 */
function buildSearchUrl(params: SegmentationSearchParams): string {
  const baseUrl = "https://www.allabolag.se/segmentation";
  const queryParams: string[] = [];

  if (params.location) {
    // Capitalize the first letter of each word in the location
    const formattedLocation = params.location
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
    queryParams.push(`location=${encodeURIComponent(formattedLocation)}`);
  }

  if (params.proffIndustryCode) {
    queryParams.push(
      `proffIndustryCode=${encodeURIComponent(params.proffIndustryCode)}`
    );
  }

  if (params.companyType) {
    queryParams.push(`companyType=${encodeURIComponent(params.companyType)}`);
  }

  if (params.revenueFrom !== undefined) {
    queryParams.push(`revenueFrom=${params.revenueFrom}`);
  }

  if (params.revenueTo !== undefined) {
    queryParams.push(`revenueTo=${params.revenueTo}`);
  }

  if (params.numEmployeesFrom !== undefined) {
    queryParams.push(`numEmployeesFrom=${params.numEmployeesFrom}`);
  }

  if (params.numEmployeesTo !== undefined) {
    queryParams.push(`numEmployeesTo=${params.numEmployeesTo}`);
  }

  if (params.sort) {
    queryParams.push(`sort=${params.sort}`);
  }

  if (params.page) {
    queryParams.push(`page=${params.page}`);
  }

  return queryParams.length > 0
    ? `${baseUrl}?${queryParams.join("&")}`
    : baseUrl;
}

/**
 * Extract a numeric value from text, removing non-numeric characters
 */
function extractNumericValue(text: string): number | undefined {
  const cleanedText = text.replace(/[^0-9]/g, "");
  return cleanedText ? parseInt(cleanedText) : undefined;
}

/**
 * Extract the total count of companies from the search results page
 */
function extractTotalCount($: cheerio.Root): number {
  const countText = $("main h2")
    .filter(function (this: cheerio.Element) {
      return $(this).text().includes("företag");
    })
    .first()
    .text()
    .trim();

  const countMatch = countText.match(/(\d[\d\s]*)/);
  if (countMatch) {
    return parseInt(countMatch[1].replace(/\s/g, ""));
  }
  return 0;
}

/**
 * Extract the company name from company element
 */
function getName(element: cheerio.Element, $: cheerio.Root): string {
  const nameElement = $(element).find("h2 a").first();
  return nameElement.text().trim();
}

/**
 * Extract the company organization number from company element
 */
function getOrgNumber(element: cheerio.Element, $: cheerio.Root): string {
  // Look for spans containing "Org.nr"
  const orgElement = $(element).find("span:contains('Org.nr')");

  if (orgElement.length) {
    // Get the full text which includes both "Org.nr" and the actual number
    const fullText = orgElement.text().trim();

    // Match just the numeric part with dashes (like 559092-9195)
    const match = fullText.match(/(\d+[-]\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return "N/A";
}

/**
 * Extract location from company element
 */
function getLocation(element: cheerio.Element, $: cheerio.Root): string {
  // Location is in the span with the location-dot icon
  const locationElement = $(element).find("svg.fa-location-dot").parent();
  if (locationElement.length) {
    // Get the text content and remove any SVG text
    const fullText = locationElement.text().trim();
    // The location is the text after the SVG element
    return fullText;
  }
  return "";
}

/**
 * Extract employee count from company element
 */
function getEmployees(element: cheerio.Element, $: cheerio.Root): string {
  // Find any div that contains exactly "Anställda" text
  const $employeesHeader = $(element)
    .find("div:contains('Anställda')")
    .filter(function (this: cheerio.Element) {
      return $(this).text().trim() === "Anställda";
    });

  if (!$employeesHeader.length) return "";

  // Get the parent element that contains both the header and the value
  const $parent = $employeesHeader.parent();
  if (!$parent.length) return "";

  // Get all text and remove the header text
  const allText = $parent.text().trim();
  const headerText = "Anställda";

  return allText.replace(headerText, "").trim();
}

/**
 * Extract revenue information from company element
 */
function getRevenue(
  element: cheerio.Element,
  $: cheerio.Root
): { revenue?: number; revenueYear?: string } {
  const result: { revenue?: number; revenueYear?: string } = {};

  const $revenueElement = $(element).find("div:contains('Omsättning')");
  if (!$revenueElement.length) return result;

  const revenueText = $revenueElement.text().trim();

  // Extract year
  const yearMatch = revenueText.match(/(\d{4})/);
  if (yearMatch) {
    result.revenueYear = yearMatch[1];
  }

  // Get the revenue value from the parent element
  const valueText = $revenueElement
    .parent()
    .text()
    .replace(/Omsättning\s+\d{4}/, "")
    .trim();
  if (valueText) {
    result.revenue = extractNumericValue(valueText);
  }

  return result;
}

/**
 * Extract the link to the company details page from company element
 */
function getLink(element: cheerio.Element, $: cheerio.Root): string {
  const linkElement = $(element).find("h2 a").first();
  return linkElement.attr("href") || "";
}

function getProfit(
  element: cheerio.Element,
  $: cheerio.Root
): number | undefined {
  // TODO: Implement proper profit extraction
  return undefined;
}

/**
 * Parse a company element from the search results into a structured object
 */
function parseCompanyElement(
  element: cheerio.Element,
  $: cheerio.Root,
  params: SegmentationSearchParams
): SegmentationSearchResult {
  const link = getLink(element, $);
  const companyName = getName(element, $);
  const location = getLocation(element, $);
  const orgNumber = getOrgNumber(element, $);
  const employees = getEmployees(element, $);
  console.log("employees: ", employees);
  const { revenue, revenueYear } = getRevenue(element, $);
  const profit = getProfit(element, $);

  return {
    name: companyName,
    link: `https://www.allabolag.se${link}`,
    location,
    orgNumber: orgNumber || "N/A",
    employees,
    revenue,
    revenueYear,
    profit,
    registrationDate: undefined,
  };
}

export function findCompanyElements($: cheerio.Root): cheerio.Element[] {
  // Find all divs with class containing "SegmentationSearchResultCard"
  const companyElements = $(
    'div[class*="SegmentationSearchResultCard"]'
  ).toArray();
  return companyElements;
}

/**
 * Perform a segmentation search with the given parameters
 */
export async function segmentationSearch(
  params: SegmentationSearchParams
): Promise<SegmentationSearchResponse> {
  try {
    // Validate sort parameter if present
    if (
      params.sort &&
      ![
        "relevance",
        "companyNameAsc",
        "companyNameDesc",
        "registrationDateAsc",
        "registrationDateDesc",
        "revenueAsc",
        "revenueDesc",
        "numEmployeesAsc",
        "numEmployeesDesc",
        "profitAsc",
        "profitDesc",
      ].includes(params.sort)
    ) {
      throw new Error("Invalid sort parameter");
    }

    const url = buildSearchUrl(params);
    logger.log(`Searching companies with URL: ${url}`);

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    const totalCount = extractTotalCount($);
    const companyElements = findCompanyElements($);

    const results: SegmentationSearchResult[] = [];
    companyElements.forEach((element) => {
      results.push(parseCompanyElement(element, $, params));
    });

    return {
      results: results,
      totalCount: totalCount,
    };
  } catch (error) {
    logger.log("Error in segmentation search:", error);
    throw error;
  }
}
