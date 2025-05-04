export interface CompanySearchResult {
  name: string;
  orgNumber: string;
  location: string;
  link: string;
  revenue?: string;
  employees?: string;
}

export interface SegmentationSearchParams {
  proffIndustryCode?: string;
  location?: string;
  companyType?: string;
  revenueFrom?: number;
  revenueTo?: number;
  numEmployeesFrom?: number;
  numEmployeesTo?: number;
  page?: number;
  sort?:
    | "companyNameDesc"
    | "companyNameAsc"
    | "registrationDateDesc"
    | "registrationDateAsc"
    | "numEmployeesAsc"
    | "numEmployeesDesc"
    | "relevance"
    | "revenueAsc"
    | "revenueDesc"
    | "profitAsc"
    | "profitDesc";
}

export interface SegmentationSearchResult {
  name: string;
  orgNumber: string;
  location: string;
  link: string;
  revenue?: number;
  revenueYear?: string;
  employees?: number;
  profit?: number;
  profitYear?: string;
  industry?: string[];
  registrationDate?: Date;
}

export interface SegmentationSearchResponse {
  results: SegmentationSearchResult[];
  totalCount: number;
}

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
