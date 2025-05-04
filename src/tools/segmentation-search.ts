/**
 * Todo: implement segmentation search, supporting following parameters:
 *
 * * parameters:
 * - proffIndustryCode (string)
 * - location (string)
 * - companyType (string)
 * - revenueFrom (thousand sek)
 * - revenueTo (thousand sek)
 * - numEmployeesFrom (number)
 * - numEmployeesTo (number)
 * - page (number)
 * - sort
 *    - companyNameDesc
 *    - companyNameAsc
 *    - registrationDateDesc
 *    - registrationDateAsc
 *    - numEmployeesAsc
 *    - numEmployeesDesc
 *    - relevance
 *    - revenueAsc
 *    - revenueDesc
 *    - profitAsc
 *    - profitDesc
 *
 *
 *
 * example: https://www.allabolag.se/segmentering?proffIndustryCode=10002115&location=Stockholm&companyType=AB&revenueFrom=0&revenueTo=100000&numEmployeesFrom=2&numEmployeesTo=20&sort=registrationDateDesc&page=6
 *
 * Use playwright to inspect how to get the data for each copmany:
 * Use simple and reliable web scraping, assuming as little as possible to get the following data for each company:
 * company name
 * location
 * revenue (year)
 * num employees
 * profit (year)
 *
 *
 */
