import { NextResponse } from "next/server";
import { filterSchoolDirectory } from "@/lib/school-directory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 300);

  return NextResponse.json(
    filterSchoolDirectory({
      region: searchParams.get("region") ?? undefined,
      district: searchParams.get("district") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: Number.isFinite(limit) ? limit : 300
    })
  );
}
