import { NextResponse } from "next/server";
import { z } from "zod";
import { ParentPlanRequest, buildParentPlan } from "@/lib/parent-plan";

export async function POST(request: Request) {
  try {
    const body = ParentPlanRequest.parse(await request.json());
    const plan = buildParentPlan(body);

    if (!plan) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(plan);
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
