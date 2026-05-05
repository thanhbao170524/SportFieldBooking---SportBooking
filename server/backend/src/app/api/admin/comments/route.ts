import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";
import { getAuthUser, requireRole } from "@/middleware/auth.middleware";
import { serverErrorResponse, successResponse } from "@/lib/response";

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
    const { user, error } = await getAuthUser(req);
    if (error) return error;
    const roleError = requireRole(user, ["ADMIN"]);
    if (roleError) return roleError;

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