import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { logger } from "./logger.js";
import { searchCompanies } from "./tools/search-companies.js";
import { getCompanyInfo } from "./tools/get-company-info.js";
import { segmentationSearch } from "./tools/segmentation-search.js";

const server = new McpServer({
  name: "allabolag",
  version: "1.0.0",
});

logger.log("Starting server");

server.tool(
  "search-companies",
  "Search for companies by name or location",
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
        content: [{ type: "text", text: formattedResults }],
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
  "segmentation-search",
  "Search companies by industry, location, revenue, employees, and more",
  {
    proffIndustryCode: z.string().optional().describe("Industry code"),
    location: z.string().optional().describe("Company location"),
    companyType: z.string().optional().describe("Type of company (e.g., 'AB')"),
    revenueFrom: z
      .number()
      .optional()
      .describe("Minimum revenue in thousand SEK"),
    revenueTo: z
      .number()
      .optional()
      .describe("Maximum revenue in thousand SEK"),
    numEmployeesFrom: z
      .number()
      .optional()
      .describe("Minimum number of employees"),
    numEmployeesTo: z
      .number()
      .optional()
      .describe("Maximum number of employees"),
    sort: z
      .enum([
        "companyNameDesc",
        "companyNameAsc",
        "registrationDateDesc",
        "registrationDateAsc",
        "numEmployeesAsc",
        "numEmployeesDesc",
        "relevance",
        "revenueAsc",
        "revenueDesc",
        "profitAsc",
        "profitDesc",
      ])
      .optional()
      .describe("Sort order for results"),
    page: z
      .number()
      .optional()
      .describe("Page number to fetch (1-indexed, defaults to 1)"),
  },
  async (params) => {
    logger.log("Segmentation search called with params:", params);

    try {
      // Log the filters being applied
      const filters = [];
      if (params.location) filters.push(`Location: ${params.location}`);
      if (
        params.numEmployeesFrom !== undefined ||
        params.numEmployeesTo !== undefined
      ) {
        const from = params.numEmployeesFrom ?? 0;
        const to = params.numEmployeesTo ?? "∞";
        filters.push(`Employees: ${from} - ${to}`);
      }
      if (params.revenueFrom !== undefined || params.revenueTo !== undefined) {
        const from = params.revenueFrom ?? 0;
        const to = params.revenueTo ?? "∞";
        filters.push(`Revenue: ${from} - ${to} (thousand SEK)`);
      }
      if (params.companyType)
        filters.push(`Company type: ${params.companyType}`);
      if (params.proffIndustryCode)
        filters.push(`Industry: ${params.proffIndustryCode}`);

      logger.log(`Applying filters: ${filters.join(", ")}`);

      const { results, totalCount } = await segmentationSearch(params);
      logger.log(
        `Segmentation search results received: ${results.length} of total ${totalCount}`
      );

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

      // Always return the detailed information
      let response = `Found ${totalCount} companies matching your criteria. Showing page ${
        params.page || 1
      } results:\n\n`;

      // Format the results as a table
      results.forEach((company, index) => {
        response += `${index + 1}. ${company.name}\n`;
        if (company.revenue && company.revenueYear) {
          response += `   Revenue: ${company.revenue} SEK (${company.revenueYear})\n`;
        }
        if (company.employees) {
          response += `   Employees: ${company.employees}\n`;
        }
        if (company.location) {
          response += `   Location: ${company.location}\n`;
        }
        if (company.orgNumber) {
          response += `   Org number: ${company.orgNumber}\n`;
        }
        response += `\n`;
      });

      return {
        content: [
          {
            type: "text",
            text: response,
          },
        ],
      };
    } catch (error) {
      logger.log("Error in segmentation search:", error);
      return {
        content: [
          {
            type: "text",
            text: "Failed to perform company segmentation search. Please try again later.",
          },
        ],
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

logger.log("Server started");

const transport = new StdioServerTransport();
await server.connect(transport);
