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
    // Viewing comments should require view permission; moderation is enforced on PATCH/DELETE.
    const auth = await requireAdminPermissions(req, ["view_posts"]);
    if (auth.error) return auth.error;

    const comments = await prisma.comment.findMany({
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
    console.error("GET Admin Comments Error:", error);
    return serverErrorResponse(error);
  }
}