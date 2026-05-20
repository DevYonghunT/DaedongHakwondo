import { NextResponse } from "next/server";
import { getDataQualitySummary } from "@/lib/data-quality";

export async function GET() {
  return NextResponse.json(getDataQualitySummary());
}
