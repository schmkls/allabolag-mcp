import * as cheerio from "cheerio";
import { logger } from "../logger.js";
import { fetchPage } from "../lib/scraping.js";

export interface CompanySearchResult {
  name: string;
  orgNumber: string;
  location: string;
  link: string;
  revenue?: string;
  employees?: string;
}

export async function searchCompanies(
  query: string
): Promise<CompanySearchResult[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.allabolag.se/bransch-s%C3%B6k?q=${encodedQuery}`;

    const data = await fetchPage(url);

    const $ = cheerio.load(data);
    const results: CompanySearchResult[] = [];

    // Debug: Log the entire HTML to check structure
    logger.log("Page HTML:", data.substring(0, 500) + "...");

    // First try the search results container
    const searchContainer = $(".MuiGrid-root.SearchResultCard-card");
    logger.log("Found search results:", searchContainer.length);

    searchContainer.each((_, element) => {
      try {
        const name = $(element)
          .find("h2.MuiTypography-h3 a")
          .first()
          .text()
          .trim();
        const orgNumberEl = $(element)
          .find(".CardHeader-propertyList")
          .filter((_, el) => $(el).text().includes("Org.nr"));
        const orgNumber = orgNumberEl.text().replace("Org.nr", "").trim();
        const location = $(element)
          .find(".fa-location-dot")
          .parent()
          .text()
          .trim();
        const link =
          $(element).find("h2.MuiTypography-h3 a").first().attr("href") || "";

        const revenueEl = $(element)
          .find(".CardHeader-propertyBlock")
          .filter((_, el) => $(el).text().includes("Omsättning"));
        const revenue = revenueEl
          .text()
          .replace("Omsättning", "")
          .replace(/\\d{4}/, "")
          .trim();

        const employeesEl = $(element)
          .find(".CardHeader-propertyBlock")
          .filter((_, el) => $(el).text().includes("Anställda"));
        const employees = employeesEl.text().replace("Anställda", "").trim();

        logger.log("Found company:", { name, orgNumber, location, link });

        if (name && orgNumber) {
          results.push({
            name,
            orgNumber,
            location,
            link,
            revenue: revenue || undefined,
            employees: employees || undefined,
          });
        }
      } catch (err) {
        logger.log("Error parsing company element:", err);
      }
    });

    logger.log("Total results found:", results.length);
    return results;
  } catch (error) {
    logger.log("Error searching companies:", error);
    throw new Error("Failed to search companies");
  }
}
