import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  _: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const { id } = await params;
    await prisma.comment.delete({
      where: { id }
    });

    return NextResponse.json({
      message: "Xóa comment thành công"
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}