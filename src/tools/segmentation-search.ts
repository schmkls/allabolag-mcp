import * as cheerio from "cheerio";
import { logger } from "../logger.js";
import { fetchPage } from "../lib/scraping.js";
import {
  SegmentationSearchParams,
  SegmentationSearchResult,
} from "../types/index.js";

export async function segmentationSearch(
  params: SegmentationSearchParams
): Promise<SegmentationSearchResult[]> {
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
    if (params.page && params.page > 1) {
      queryParams.set("page", params.page.toString());
    }

    const url = `https://www.allabolag.se/segmentering?${queryParams.toString()}`;
    logger.log("Fetching segmentation search with URL:", url);

    const data = await fetchPage(url);
    const $ = cheerio.load(data);
    const results: SegmentationSearchResult[] = [];

    // Debug log the HTML structure
    logger.log("Page HTML:", data.substring(0, 500) + "...");

    // Find all company cards/sections in the main content
    // Company cards usually start with an h2 heading containing a link with the company name
    $("main h2").each((_, element) => {
      // Skip non-company headers (like "469 företag" or "Köp denna lista")
      const companyLink = $(element).find("a").first();
      if (!companyLink.length) return;

      try {
        // Extract company name from heading
        const name = companyLink.text().trim();
        // Extract link
        const link = companyLink.attr("href") || "";

        // Get the company card/container
        const companyCard = $(element).closest(".MuiGrid-root");

        // If we couldn't find a card container, try the parent element as fallback
        const companyContainer = companyCard.length
          ? companyCard
          : $(element).parent();

        // Extract organization number - looking for text containing "Org.nr"
        const orgNumberEl = companyContainer
          .find(":contains('Org.nr')")
          .first();
        let orgNumber = "";

        if (orgNumberEl.length) {
          // Get the parent that contains both the label and value
          const orgNumberParent = orgNumberEl.parent();
          orgNumber = orgNumberParent.text().replace("Org.nr", "").trim();
        }

        // Extract location - typically follows the org number
        // Location is often in its own element with no specific label
        let location = "";

        // Try to find location by checking elements after org number
        const locationEl = orgNumberEl.parent().next();
        if (locationEl.length) {
          // Location typically doesn't have a label, so just the text is the location
          location = locationEl.text().trim();

          // If it has "Anställda" or "Omsättning", it's not the location
          if (
            location.includes("Anställda") ||
            location.includes("Omsättning")
          ) {
            location = "";
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
          // Pattern: "Omsättning 2023 5 560" or similar
          const revenueMatch = revenueFull.match(
            /Omsättning\s+(\d{4})\s+([\d\s]+)/
          );
          if (revenueMatch) {
            revenueYear = revenueMatch[1];
            revenue = revenueMatch[2].trim();
          } else {
            // Try alternate format without year
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

        // Extract industry (branches)
        // Industries are links with href containing "bransch"
        const industryLinks = companyContainer.find("a[href*='bransch']");
        const industry: string[] = [];

        industryLinks.each((_, link) => {
          const industryText = $(link).text().trim();
          if (industryText) {
            industry.push(industryText);
          }
        });

        // Only add if we found at least a name and a link
        if (name && link) {
          results.push({
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

    logger.log("Total segmentation results found:", results.length);
    return results;
  } catch (error) {
    logger.log("Error in segmentation search:", error);
    throw new Error("Failed to perform segmentation search");
  }
}
