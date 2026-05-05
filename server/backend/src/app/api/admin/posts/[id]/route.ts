import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(
  _: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        club: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      message: "Lấy chi tiết post thành công",
      data: post
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}