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
 * Extract the company name from the element
 */
function getName(element: cheerio.Element, $: cheerio.Root): string {}

/**
 * Extract the company organization number from the element
 */
function getOrgNumber(
  element: cheerio.Element,
  $: cheerio.Root
): string | undefined {
  const $orgElement = $(element).find("div:contains('Org.nr')");
  if ($orgElement.length) {
    const orgText = $orgElement.text();
    return orgText.replace("Org.nr", "").trim();
  }
  return undefined;
}

/**
 * Extract location from company element or URL
 */
function getLocation(
  element: cheerio.Element,
  $: cheerio.Root,
  link: string,
  requestedLocation?: string
): string {
  // If we have a requested location in the search params, prioritize it
  if (requestedLocation) {
    return requestedLocation;
  }

  // First try to extract from URL
  if (link) {
    const locationMatch = link.match(/\/foretag\/.*\/(.*?)\//);
    if (locationMatch && locationMatch[1]) {
      return formatLocation(decodeURIComponent(locationMatch[1]));
    }
  }

  // Try postal address div
  const locationDiv = $(element)
    .children("div")
    .filter(function (this: cheerio.Element) {
      const text = $(this).text().trim();
      return text.match(/^\d{3}\s?\d{2}\s?[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/) !== null;
    });

  if (locationDiv.length) {
    const fullText = locationDiv.text().trim();
    const locationPart = fullText.replace(/^\d{3}\s?\d{2}\s?/, "").trim();
    return locationPart;
  }

  return "";
}

/**
 * Extract employee count from company element
 */
function getEmployees(
  element: cheerio.Element,
  $: cheerio.Root
): number | undefined {
  const $employeesElement = $(element).find("div:contains('Anställda')");
  if (!$employeesElement.length) return undefined;

  // Employee count is in the text content next to "Anställda"
  const employeeText = $employeesElement
    .parent()
    .text()
    .replace("Anställda", "")
    .trim();
  return extractNumericValue(employeeText);
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
 * Extract the link to the company details page
 */
function getLink(element: cheerio.Element, $: cheerio.Root): string {
  const linkElement = $(element).find("h2 a").first();
  return linkElement.attr("href") || "";
}

/**
 * Generate a synthetic registration date if actual data is not available
 */
function getRegistrationDate(
  element: cheerio.Element,
  $: cheerio.Root
): Date | undefined {}

/**
 * Parse a company element from the search results into a structured object
 */
function parseCompanyElement(
  element: cheerio.Element,
  $: cheerio.Root,
  params?: SegmentationSearchParams
): SegmentationSearchResult {
  const link = getLink(element, $);
  const companyName = getName(element, $);
  const location = getLocation(element, $);
  const orgNumber = getOrgNumber(element, $);
  const employees = getEmployees(element, $);
  const { revenue, revenueYear } = getRevenue(element, $);
  const profit = getProfit(element, $);
  const registrationDate = getRegistrationDate(element, $);

  return {
    name: companyName,
    link: `https://www.allabolag.se${link}`,
    location,
    orgNumber,
    employees,
    revenue,
    revenueYear,
    profit: -1,
    registrationDate,
  };
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
