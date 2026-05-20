import { NextResponse } from "next/server";
import { getAcademyTrustCard } from "@/lib/scoring";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const card = getAcademyTrustCard(id);

  if (!card) {
    return NextResponse.json({ error: "Academy not found" }, { status: 404 });
  }

  return NextResponse.json(card);
}
