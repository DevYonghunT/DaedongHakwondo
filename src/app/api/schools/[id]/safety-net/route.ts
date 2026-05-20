import { NextResponse } from "next/server";
import { WALKING_30_MIN_RADIUS_KM } from "@/lib/constants";
import { buildSchoolReport } from "@/lib/scoring";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: Context) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const radiusKm = Number(searchParams.get("radiusKm") ?? WALKING_30_MIN_RADIUS_KM);
  const report = buildSchoolReport(
    id,
    Number.isFinite(radiusKm) ? radiusKm : WALKING_30_MIN_RADIUS_KM
  );

  if (!report) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
