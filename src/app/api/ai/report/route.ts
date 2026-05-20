import { NextResponse } from "next/server";
import { z } from "zod";
import { AiReportRequest, buildAiReport, checkRateLimit } from "@/lib/ai-report";

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local";

  if (!checkRateLimit(`ai-report:${ip}`)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = AiReportRequest.parse(await request.json());
    const report = buildAiReport(body);

    if (!report) {
      return NextResponse.json({ error: "Report target not found" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
