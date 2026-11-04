"use server"

import { fetchGA4Analytics, type GA4ReportData } from "@/lib/google-analytics"

export async function getGoogleAnalyticsData(
  days: number = 30,
  outlet?: string
): Promise<GA4ReportData> {
  return await fetchGA4Analytics(days, outlet)
}
