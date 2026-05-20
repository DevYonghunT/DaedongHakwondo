import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PolicySimulationRequest,
  runPolicySimulation
} from "@/lib/policy-simulation";

export async function POST(request: Request) {
  try {
    const body = PolicySimulationRequest.parse(await request.json());
    const simulation = runPolicySimulation(body);

    if (!simulation) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(simulation);
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
