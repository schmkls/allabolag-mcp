import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import { logger } from "../logger.js";

export const defaultHeaders: AxiosRequestConfig["headers"] = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  Connection: "keep-alive",
};

export async function fetchPage(url: string): Promise<string> {
  try {
    logger.log("Fetching URL:", url);
    const response = await axios.get(url, { headers: defaultHeaders });
    logger.log("Response received, status:", response.status);
    return response.data;
  } catch (error) {
    logger.log("Error fetching page:", error);
    if (axios.isAxiosError(error)) {
      logger.log("Response status:", error.response?.status);
      logger.log("Response data:", error.response?.data);
    }
    throw new Error(
      `Failed to fetch page: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
