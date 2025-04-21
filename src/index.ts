import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { logger } from "./logger.js";
import {
  getCompanyInfo,
  searchCompanies,
  getIndustryCodes,
} from "./scraper.js";

const server = new McpServer({
  name: "allabolag",
  version: "1.0.0",
});

logger.log("Starting server");

server.tool(
  "search-companies",
  "Search for companies by name or location. Results can be filtered by industry using the segmentering page with proffIndustryCode parameter.",
  { query: z.string().describe("Search query for company name or location") },
  async ({ query }) => {
    logger.log("Starting search-companies tool with query:", query);
    try {
      logger.log("Calling searchCompanies function...");
      const results = await searchCompanies(query);
      logger.log("Search results received:", results);

      if (results.length === 0) {
        logger.log("No results found");
        return {
          content: [
            {
              type: "text",
              text: "No companies found matching your search criteria.",
            },
          ],
        };
      }

      logger.log(`Found ${results.length} companies`);
      const formattedResults = results
        .map(
          (company) =>
            `${company.name} (${company.orgNumber})\nLocation: ${company.location}\nLink: https://www.allabolag.se${company.link}\n`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text:
              formattedResults +
              "\n\nNote: You can filter companies by industry using the segmentering page with proffIndustryCode parameter (e.g., https://allabolag.se/segmentering?proffIndustryCode=10000882%2C10000898). Use the get-industry-codes tool to find available industry codes.",
          },
        ],
      };
    } catch (error: any) {
      logger.log("Error in search-companies:", error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get-company-info",
  "Get detailed company information using the company's page link from search results",
  {
    link: z
      .string()
      .describe(
        "The link path from search results (e.g. /foretag/company-name/...)"
      ),
  },
  async ({ link }) => {
    logger.log("using tool get-company-info");
    try {
      const info = await getCompanyInfo(link);

      const formattedInfo = [
        `Company Name: ${info.name}`,
        `Organization Number: ${info.orgNumber}`,
        `Location: ${info.location}`,
        `Status: ${info.status}`,
        info.revenue ? `Revenue: ${info.revenue}` : null,
        info.employees ? `Employees: ${info.employees}` : null,
        info.phone ? `Phone: ${info.phone}` : null,
        info.industry?.length
          ? `Industries: ${info.industry.join(", ")}`
          : null,
        info.description ? `\nDescription: ${info.description}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      return {
        content: [{ type: "text", text: formattedInfo }],
      };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  "get-industry-codes",
  "Get all available industry codes (proffIndustryCode) that can be used to filter companies on the segmentering page (e.g., allabolag.se/segmentering?proffIndustryCode=10000882%2C10000898)",
  {},
  async () => {
    logger.log("Using tool get-industry-codes");
    try {
      const industryCodes = await getIndustryCodes();
      logger.log(`Retrieved ${industryCodes.length} industry codes`);

      if (industryCodes.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No industry codes found.",
            },
          ],
        };
      }

      // Format the industry codes for display
      const formattedCodes = industryCodes
        .map((code) => `${code.name} (Code: ${code.proffIndustryCode})`)
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text:
              "These industry codes (proffIndustryCode) can be used to filter companies on the segmentering page:\nhttps://allabolag.se/segmentering?proffIndustryCode=CODE1%2CCODE2\n\n" +
              formattedCodes,
          },
        ],
      };
    } catch (error: any) {
      logger.log("Error in get-industry-codes:", error);
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  }
);

logger.log("Server started");

const transport = new StdioServerTransport();
await server.connect(transport);
