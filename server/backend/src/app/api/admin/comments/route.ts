import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { serverErrorResponse, successResponse } from "@/lib/response";
import { requireAdminPermissions } from "@/middleware/admin-rbac.middleware";

interface CommentItem {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    fullName: string;
  };
  post: {
    id: string;
    title: string;
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAdminPermissions(req, ["moderate_comments"]);
    if (auth.error) return auth.error;

    const comments: CommentItem[] = await prisma.comment.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true
          }
        },
        post: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return successResponse("Lấy comments thành công", comments);
  } catch (error) {
    return serverErrorResponse(error);
  }
}