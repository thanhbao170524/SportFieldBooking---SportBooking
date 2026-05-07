import { NextRequest } from "next/server";
import { getAuthUser } from "@/middleware/auth.middleware";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/response";
import { prisma } from "@/infra/db/prisma";
import { NotificationType } from "@/generated/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const { user, error } = await getAuthUser(req);
    if (error) return error;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { club: true, user: true },
    });

    if (!post) {
      return errorResponse("Bài viết không tồn tại.", 404);
    }

    // Determine who to notify
    const targetUserId = post.userId || post.club?.ownerId;

    if (targetUserId === user.userId) {
      return errorResponse("Bạn không thể tham gia kèo do chính mình tạo.");
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { fullName: true },
    });

    // Check if already requested
    const existingParticipation = await prisma.postParticipant.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId: user.userId,
        }
      }
    });

    if (existingParticipation) {
      return errorResponse("Bạn đã gửi yêu cầu tham gia kèo này rồi.");
    }

    // Create participant
    await prisma.postParticipant.create({
      data: {
        postId: post.id,
        userId: user.userId,
        status: "PENDING",
      }
    });

    // Create a notification for the creator
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: NotificationType.SYSTEM,
        title: "Yêu cầu tham gia kèo",
        body: `${dbUser?.fullName || "Một người dùng"} muốn tham gia kèo "${post.title}" của bạn. Hãy liên hệ với họ!`,
      },
    });

    return successResponse("Đã gửi yêu cầu tham gia kèo thành công.", { user: dbUser });
  } catch (error) {
    console.error("Join Match Error:", error);
    return serverErrorResponse(error);
  }
}
