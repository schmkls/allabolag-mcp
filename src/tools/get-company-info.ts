import * as cheerio from "cheerio";
import { logger } from "../logger.js";
import { fetchPage } from "../lib/scraping.js";

export interface CompanyInfo {
  name: string;
  orgNumber: string;
  location: string;
  status: string;
  revenue?: string;
  employees?: string;
  description?: string;
  phone?: string;
  industry?: string[];
}

export async function getCompanyInfo(path: string): Promise<CompanyInfo> {
  try {
    const url = `https://www.allabolag.se${path}`;

    const data = await fetchPage(url);
    const $ = cheerio.load(data);

    // Get the title which contains both name and org number
    const title = $("title").text().trim();
    const titleMatch = title.match(/^(.+?) - (\d{6}-\d{4})/);
    logger.log("Title match:", titleMatch);

    if (!titleMatch) {
      throw new Error("Could not parse company name and org number from title");
    }

    const [, name, orgNumber] = titleMatch;
    logger.log("Found name:", name);
    logger.log("Found org number:", orgNumber);

    // Get location from meta description
    const metaDescription = $('meta[name="description"]').attr("content") || "";
    logger.log("Meta description:", metaDescription);

    // Look for address in the page content
    const location = $(".fa-location-dot").parent().text().trim();
    logger.log("Found location:", location);

    // Get phone number if available
    const phone = $(".fa-phone-flip")
      .parent()
      .text()
      .replace("Telefon", "")
      .trim();
    logger.log("Found phone:", phone);

    // Get company metrics
    const metrics = $(".CardHeader-propertyBlock");
    let revenue: string | undefined;
    let employees: string | undefined;

    metrics.each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes("Omsättning")) {
        revenue = text.replace("Omsättning", "").replace(/\d{4}/, "").trim();
      } else if (text.includes("Anställda")) {
        employees = text.replace("Anställda", "").trim();
      }
    });

    logger.log("Found revenue:", revenue);
    logger.log("Found employees:", employees);

    // Get industry tags
    const industries: string[] = [];
    $(".IndustryTags-tags .Tag-root a").each((_, element) => {
      industries.push($(element).text().trim());
    });
    logger.log("Found industries:", industries);

    // Get company description if available
    const description = $(".company-description").text().trim();
    logger.log("Found description:", description);

    const result = {
      name,
      orgNumber,
      location,
      status: "Active", // Default to active since we can see the page
      revenue,
      employees,
      description: description || undefined,
      phone: phone || undefined,
      industry: industries.length > 0 ? industries : undefined,
    };

    logger.log("Final result:", result);
    return result;
  } catch (error) {
    logger.log("Error getting company info:", error);
    if (error instanceof Error) {
      logger.log("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    throw new Error("Failed to get company information");
  }
}
