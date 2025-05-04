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
    logger.log("Starting segmentation-search with params:", params);
    try {
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

      // Check if the query is just about the count
      const numEmployeesFilter =
        params.numEmployeesFrom !== undefined ||
        params.numEmployeesTo !== undefined;
      const locationFilter = params.location !== undefined;

      // If we're just checking for a count, return a simplified response
      if (numEmployeesFilter || locationFilter) {
        return {
          content: [
            {
              type: "text",
              text: `Found ${totalCount} companies matching your criteria.`,
            },
          ],
        };
      }

      let response = `Found ${totalCount} companies. Showing page ${
        params.page || 1
      } results:\n\n`;
      const formattedResults = results
        .map((company) => {
          let result = `${company.name} (${company.orgNumber})\n`;
          result += `Location: ${company.location}\n`;

          if (company.revenue) {
            result += `Revenue${
              company.revenueYear ? " " + company.revenueYear : ""
            }: ${company.revenue}\n`;
          }

          if (company.employees) {
            result += `Employees: ${company.employees}\n`;
          }

          if (company.registrationDate) {
            result += `Registration Date: ${company.registrationDate}\n`;
          }

          if (company.industry && company.industry.length > 0) {
            result += `Industry: ${company.industry.join(", ")}\n`;
          }

          result += `Link: https://www.allabolag.se${company.link}\n`;
          return result;
        })
        .join("\n");

      return {
        content: [{ type: "text", text: response + formattedResults }],
      };
    } catch (error: any) {
      logger.log("Error in segmentation-search:", error);
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

logger.log("Server started");

const transport = new StdioServerTransport();
await server.connect(transport);
