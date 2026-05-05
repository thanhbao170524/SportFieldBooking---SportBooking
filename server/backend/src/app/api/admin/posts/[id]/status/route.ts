import { NextRequest, NextResponse } from "next/server";
import { togglePostStatus } from "@/modules/admin/admin.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const { id } = await params;

  const data = await togglePostStatus(id, body.status);

  return NextResponse.json({ data });
}