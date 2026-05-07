import { prisma } from "@/infra/db/prisma";
import { ApprovalStatus, CourtStatus, PostStatus } from "@/generated/prisma";
import { notifyNewBooking } from "@/infra/realtime/socket";
import { notifyPlayersAboutOwnerPost } from "@/modules/user/notification.service";
import {
  DEFAULT_PERMISSIONS_MATRIX,
  PermissionsMatrix,
  getPermissionsMatrix,
  savePermissionsMatrix,
} from "@/modules/admin/rbac";

const DEFAULT_COMMISSION_RATE = 0.1; // 10% phí nền tảng (admin revenue)


export async function getPermissionsAdmin(): Promise<PermissionsMatrix> {
  return getPermissionsMatrix();
}

export async function updatePermissionsAdmin(
  matrix: PermissionsMatrix
): Promise<PermissionsMatrix> {
  return savePermissionsMatrix(matrix);
}

/**
 * Lấy danh sách tất cả các câu lạc bộ và sân chi tiết (Dành cho Admin)
 */
export async function getAllClubsAdmin() {
  return prisma.club.findMany({
    include: {
      owner: {
        select: {
          fullName: true,
          phone: true,
          email: true,
        }
      },
      images: {
        select: {
          url: true,
        }
      },
      courts: {
        select: {
          id: true,
          name: true,
          sportType: true,
          status: true,
          capacity: true,
          surface: true,
          images: {
            select: {
              url: true,
            }
          },
          pricings: true,
        }
      },
      _count: {
        select: {
          courts: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc',
    }
  });
}

/**
 * Duyệt hoặc từ chối một câu lạc bộ
 */
export async function updateClubApprovalStatus(clubId: string, status: ApprovalStatus) {
  const updatedClub = await prisma.club.update({
    where: { id: clubId },
    data: {
      approvalStatus: status,
      // Nếu duyệt thì mặc định active luôn
      isActive: status === ApprovalStatus.APPROVED,
    }
  });

  // Notify if the club's approval or status might affect availability
  notifyNewBooking(clubId, {
    club: updatedClub,
    type: `club-approval-${status.toLowerCase()}`
  });

  return updatedClub;
}

/**
 * Khóa hoặc mở khóa một câu lạc bộ (và tất cả sân thuộc nó)
 */
export async function toggleClubActiveStatus(clubId: string, isActive: boolean) {
  return prisma.$transaction(async (tx) => {
    // 1. Cập nhật CLB
    const club = await tx.club.update({
      where: { id: clubId },
      data: { isActive }
    });

    console.log(`DEBUG: toggleClubActiveStatus - Club ${clubId} updated to isActive=${isActive}`);

    // 2. Cập nhật tất cả sân thuộc CLB
    // Nếu CLB bị khóa, tất cả sân bị treo (SUSPENDED)
    // Nếu CLB mở lại, tất cả sân về hoạt động (ACTIVE) 
    await tx.court.updateMany({
      where: { clubId },
      data: {
        status: isActive ? CourtStatus.ACTIVE : CourtStatus.SUSPENDED
      }
    });

    // 3. Thông báo Real-time
    notifyNewBooking(clubId, {
      club,
      type: `club-toggled-${isActive ? 'active' : 'inactive'}`
    });

    return club;
  });
}

/**
 * Khóa hoặc mở khóa một sân đơn lẻ
 */
export async function toggleCourtStatus(courtId: string, status: CourtStatus) {
  return prisma.court.update({
    where: { id: courtId },
    data: { status }
  });
}

/**
 * Lấy danh sách hồ sơ KYC của Owner đang chờ duyệt
 */
export async function getAllOwnerKYCAdmin() {
  return prisma.ownerProfile.findMany({
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          phone: true,
          ownedClubs: {
            select: {
              id: true,
              name: true,
              approvalStatus: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Lấy danh sách tất cả các chủ sở hữu (Owners) và hồ sơ đi kèm
 */
export async function getAllOwnersAdmin() {
  return prisma.ownerProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          ownedClubs: {
            include: {
              images: { select: { url: true }, take: 1 }
            }
          },
          _count: {
             select: { ownedClubs: true }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

/**
 * Duyệt hoặc từ chối KYC của Owner
 */
export async function updateOwnerKYCStatus(profileId: string, status: ApprovalStatus, note?: string) {
  return prisma.ownerProfile.update({
    where: { id: profileId },
    data: {
      kycStatus: status,
      kycNote: note,
      kycReviewedAt: new Date(),
    }
  });
}

/**
 * Lấy số liệu tổng quan (Counts) cho Admin Sidebar/Dashboard
 */
export async function getAdminSummary(startDate?: string, endDate?: string) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (endDate) {
    end.setHours(23, 59, 59, 999);
  }

  console.log("DEBUG: getAdminSummary - Starting Promise.all for stats", { start, end });
  const [
    pendingClubs, pendingKyc, totalUsers, activeClubs,
    totalBookings, filteredBookings, filteredRevenue,
    confirmedBookings, cancelledBookings,
    userStats, courtStats,
    trendStats, bookingStatusBreakdown,
    pendingReports, totalClubs,
    visitStats
  ] = await Promise.all([
    prisma.club.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
    prisma.ownerProfile.count({ where: { kycStatus: ApprovalStatus.PENDING } }),
    prisma.user.count(),
    prisma.club.count({ where: { approvalStatus: ApprovalStatus.APPROVED, isActive: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.booking.aggregate({
      where: { status: 'CONFIRMED', createdAt: { gte: start, lte: end } },
      _sum: { finalAmount: true }
    }),
    prisma.booking.count({ where: { status: 'CONFIRMED', createdAt: { gte: start, lte: end } } }),
    prisma.booking.count({ where: { status: 'CANCELLED', createdAt: { gte: start, lte: end } } }),
    getUserStatsAdmin(startDate, endDate),
    getCourtStatsAdmin(),
    getTrendStatsAdmin(startDate, endDate),
    prisma.booking.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { createdAt: { gte: start, lte: end } }
    }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.club.count(),
    getVisitStatsAdmin(startDate, endDate),
  ]);
  console.log("DEBUG: getAdminSummary - Promise.all completed");

  // Derived calculations
  const totalRevenue = Number(filteredRevenue._sum.finalAmount || 0);
  const platformCommission = Math.round(totalRevenue * DEFAULT_COMMISSION_RATE);
  const averageBookingValue = filteredBookings > 0 ? Math.round(totalRevenue / filteredBookings) : 0;
  const paymentSuccessRate = filteredBookings > 0 ? Math.round((confirmedBookings / filteredBookings) * 100) : 0;

  // Court fill rate: ratio of confirmed bookings to total active courts × days in period
  const periodDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  // Assume each active court can host ~4 sessions per day (adjustable)
  const maxSessions = courtStats.active * periodDays * 4;
  const fillRate = maxSessions > 0 ? Math.min(100, Math.round((confirmedBookings / maxSessions) * 100)) : 0;

  return {
    users: {
      totalUsers,
      newUsers: userStats.newUsers,
      activeUsers: userStats.active,
    },
    clubs: {
      activeClubs,
      totalClubs,
    },
    courts: {
      totalCourts: courtStats.total,
      activeCourts: courtStats.active,
      fillRate,
    },
    approvals: {
      pendingClubs,
      pendingKyc,
    },
    bookings: {
      totalBookings: filteredBookings,
      confirmedBookings,
      cancelledBookings,
    },
    revenue: {
      totalRevenue,
      platformCommission,
      averageBookingValue,
      commissionRate: DEFAULT_COMMISSION_RATE,
    },
    payments: {
      successRate: paymentSuccessRate,
    },
    moderation: {
      pendingReports,
    },
    visits: {
      totalVisits: visitStats.totalVisits,
      uniqueUsers: visitStats.uniqueUsers,
    },
    violations: pendingReports,
    charts: {
      monthly: trendStats,
      bookingStatus: bookingStatusBreakdown.map(item => ({
        status: item.status,
        count: item._count._all,
      })),
    },
    periodDays,
  };
}

/**
 * Lấy thống kê xu hướng (trend) theo ngày hoặc tháng tùy vào khoảng thời gian
 */
export async function getTrendStatsAdmin(startDate?: string, endDate?: string) {
  const now = new Date();
  const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const end = endDate ? new Date(endDate) : new Date();
  
  if (endDate) {
    end.setHours(23, 59, 59, 999);
  }

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let interval = 'month';
  let format = 'MM/YYYY';

  if (diffDays <= 32) {
    interval = 'day';
    format = 'DD/MM';
  }

  // Raw query with dynamic interval
  const stats: any[] = await prisma.$queryRawUnsafe(`
    SELECT 
      TO_CHAR(date_trunc('${interval}', "createdAt"), '${format}') as month_label,
      date_trunc('${interval}', "createdAt") as date_bucket,
      COUNT(id)::int as count
    FROM bookings
    WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND "deletedAt" IS NULL
    GROUP BY month_label, date_bucket
    ORDER BY date_bucket ASC
  `, start, end);

  // Fill in zero values for days/months with no bookings
  const filledStats = [];
  const current = new Date(start);
  
  if (interval === 'day') {
    current.setHours(0, 0, 0, 0);
    const endBound = new Date(end);
    endBound.setHours(0, 0, 0, 0);

    while (current <= endBound) {
      const label = `${current.getDate().toString().padStart(2, '0')}/${(current.getMonth() + 1).toString().padStart(2, '0')}`;
      const match = stats.find(s => s.month_label === label);
      filledStats.push({
        month: label,
        count: match ? match.count : 0
      });
      current.setDate(current.getDate() + 1);
    }
  } else {
    // month interval
    current.setDate(1);
    current.setHours(0, 0, 0, 0);
    const endBound = new Date(end);
    endBound.setDate(1);
    endBound.setHours(0, 0, 0, 0);

    while (current <= endBound) {
      const label = `${(current.getMonth() + 1).toString().padStart(2, '0')}/${current.getFullYear()}`;
      const match = stats.find(s => s.month_label === label);
      filledStats.push({
        month: label,
        count: match ? match.count : 0
      });
      current.setMonth(current.getMonth() + 1);
    }
  }

  return filledStats;
}

/**
 * Lấy thống kê theo tháng (12 tháng gần nhất)
 */
export async function getMonthlyStatsAdmin() {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const stats = await prisma.$queryRawUnsafe(`
    SELECT 
      TO_CHAR(date_trunc('month', "createdAt"), 'MM/YYYY') as month,
      COUNT(id)::int as count
    FROM bookings
    WHERE "createdAt" >= $1
    GROUP BY month, date_trunc('month', "createdAt")
    ORDER BY date_trunc('month', "createdAt") ASC
  `, start);

  return stats;
}

/**
 * Lấy danh sách tất cả người dùng (Admin)
 */
export async function getAllUsersAdmin() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      isActive: true,
      avatarUrl: true,
      createdAt: true,
      _count: {
        select: {
          bookings: true,
          ownedClubs: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc',
    }
  });
}

/**
 * Đếm số Admin đang hoạt động (dùng để bảo vệ Super Admin duy nhất)
 */
export async function countActiveAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
}

/**
 * Khóa hoặc mở khóa một tài khoản người dùng.
 * Quy tắc bảo vệ:
 *  - Không thể khóa tài khoản Admin khác (cùng cấp).
 *  - Nếu chỉ còn 1 Admin hoạt động, không được khóa Admin đó.
 */
export async function toggleUserActiveStatus(
  actorId: string,
  userId: string,
  isActive: boolean
) {
  // Lấy thông tin target user
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!target) throw new Error('USER_NOT_FOUND');

  // Lấy thông tin người thực hiện
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: { id: true, role: true },
  });
  if (!actor) throw new Error('ACTOR_NOT_FOUND');

  // Không cho phép Admin khóa Admin khác cùng cấp
  if (target.role === 'ADMIN' && actor.role === 'ADMIN' && actor.id !== target.id) {
    throw new Error('CANNOT_LOCK_PEER_ADMIN');
  }

  // Bảo vệ: không khóa Admin duy nhất còn hoạt động
  if (!isActive && target.role === 'ADMIN') {
    const activeAdminCount = await countActiveAdmins();
    if (activeAdminCount <= 1) {
      throw new Error('CANNOT_LOCK_LAST_ADMIN');
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: actorId,
      action: isActive ? 'UNLOCK_USER' : 'LOCK_USER',
      entity: 'User',
      entityId: userId,
      details: { targetRole: target.role, newStatus: isActive },
    },
  }).catch(() => {});

  return updated;
}

/**
 * Lấy tất cả bài đăng (Admin)
 */
export async function getAllPostsAdmin() {
  return prisma.post.findMany({
    include: {
      club: {
        select: {
          id: true,
          name: true
        }
      },
      comments: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Ẩn / hiện bài đăng
 */
export async function togglePostStatus(postId: string, status: PostStatus) {
  return prisma.post.update({
    where: { id: postId },
    data: { status }
  });
}

/**
 * Xoá mềm bài đăng
 */
export async function deletePostAdmin(postId: string) {
  return prisma.post.update({
    where: { id: postId },
    data: { deletedAt: new Date() }
  });
}

/**
 * Duyệt bài đăng của chủ sân: chuyển PENDING -> ACTIVE và gửi thông báo cho người chơi.
 */
export async function approveOwnerPostAdmin(postId: string, adminId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    include: { club: { select: { id: true, name: true } } },
  });
  if (!post) throw new Error("POST_NOT_FOUND");

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { status: "ACTIVE" },
  });

  // Audit
  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "APPROVE_POST",
      entity: "Post",
      entityId: postId,
      details: { from: post.status, to: "ACTIVE" },
    },
  });

  // Notify players (best-effort)
  try {
    await notifyPlayersAboutOwnerPost({
      clubId: post.clubId,
      clubName: post.club?.name || "Câu lạc bộ",
      postType: post.type,
      title: post.title,
      content: post.content,
    });
  } catch (err) {
    console.error("notifyPlayersAboutOwnerPost failed:", err);
  }

  return updated;
}

/**
 * Từ chối bài đăng: chuyển về HIDDEN (không hiển thị public).
 */
export async function rejectOwnerPostAdmin(postId: string, adminId: string, note?: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, status: true, clubId: true },
  });
  if (!post) throw new Error("POST_NOT_FOUND");

  const updated = await prisma.post.update({
    where: { id: postId },
    data: { status: "HIDDEN" },
  });

  await prisma.auditLog.create({
    data: {
      userId: adminId,
      action: "REJECT_POST",
      entity: "Post",
      entityId: postId,
      details: { from: post.status, to: "HIDDEN", note: note || null },
    },
  });

  return updated;
}

/* =====================================================
   ================= REPORT / VIOLATION
===================================================== */

/**
 * Lấy danh sách report (vi phạm)
 */
export async function getAllReportsAdmin() {
  return prisma.report.findMany({
    include: {
      reporter: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Tạo báo cáo mới (từ người dùng/chủ sân)
 */
export async function createReport(data: {
  reporterId: string;
  reason: string;
  content: string;
}) {
  return prisma.report.create({
    data: {
      reporterId: data.reporterId,
      reason: data.reason,
      content: data.content,
      targetType: "SYSTEM",
      status: "PENDING",
    }
  });
}

/**
 * Xử lý report
 */
export async function handleReportAdmin(
  reportId: string,
  status: "RESOLVED" | "REJECTED",
  adminResponse?: string
) {
  try {
    console.log("DEBUG: handleReportAdmin - Updating report:", reportId, status);
    
    // 1. Cập nhật trạng thái báo cáo
    const report = await prisma.report.update({
      where: { id: reportId },
      data: { 
        status,
        adminResponse,
        updatedAt: new Date()
      }
    });

    console.log("DEBUG: handleReportAdmin - Creating notification for user:", report.reporterId);
    
    // 2. Gửi thông báo về cho người báo cáo (bọc trong try-catch riêng để không làm hỏng flow chính)
    try {
      await prisma.notification.create({
        data: {
          userId: report.reporterId,
          type: "SYSTEM",
          title: status === "RESOLVED" ? "Báo cáo của bạn đã được xử lý" : "Báo cáo của bạn đã bị từ chối",
          body: adminResponse || (status === "RESOLVED" ? "Admin đã duyệt báo cáo của bạn." : "Yêu cầu báo cáo không phù hợp."),
        }
      });
      console.log("DEBUG: handleReportAdmin - Notification sent successfully");
    } catch (notifError) {
      console.error("ERROR: handleReportAdmin - Failed to create notification:", notifError);
      // Vẫn tiếp tục vì report đã được cập nhật xong
    }

    return report;
  } catch (error) {
    console.error("ERROR: handleReportAdmin - Global failure:", error);
    throw error;
  }
}

/**
 * Lấy số lượng vi phạm
 */
export async function countViolations() {
  return prisma.report.count({
    where: { status: "PENDING" }
  });
}

/* =====================================================
   ================= ANALYTICS
===================================================== */

/**
 * Thống kê user theo thời gian
 */
interface UserStats {
  total: number;
  active: number;
  newUsers: number;
}
export async function getUserStatsAdmin(
  startDate?: string,
  endDate?: string
): Promise<UserStats> {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  const [total, active, newUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { isActive: true }
    }),
    prisma.user.count({
      where:
        start && end
          ? {
              createdAt: {
                gte: start,
                lte: end
              }
            }
          : undefined
    })
  ]);

  return {
    total,
    active,
    newUsers
  };
}

/**
 * Thống kê doanh thu chi tiết
 */
interface RevenueStats {
  totalRevenue: number;
  totalBookings: number;
}

export async function getRevenueStatsAdmin(
  startDate?: string,
  endDate?: string
): Promise<RevenueStats> {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  const result = await prisma.booking.aggregate({
    where: {
      status: "CONFIRMED",
      ...(start && end
        ? {
            createdAt: {
              gte: start,
              lte: end
            }
          }
        : {})
    },
    _sum: {
      finalAmount: true
    },
    _count: {
      _all: true
    }
  });

  return {
    totalRevenue: Number(result._sum.finalAmount ?? 0),
    totalBookings: result._count._all
  };
}

/**
 * Thống kê sân (usage)
 */
// export async function getCourtStatsAdmin() {
//   return prisma.court.groupBy({
//     by: ["status"],
//     _count: true
//   });
// }
interface CourtStats {
  total: number;
  active: number;
  suspended: number;
  inactive: number;
  maintenance: number;
}

export async function getCourtStatsAdmin(): Promise<CourtStats> {
  const grouped = await prisma.court.groupBy({
    by: ["status"],
    _count: {
      _all: true
    }
  });

  // init mặc định
  const stats: CourtStats = {
    total: 0,
    active: 0,
    suspended: 0,
    inactive: 0,
    maintenance: 0
  };

  for (const item of grouped) {
    const count = item._count._all;

    stats.total += count;

    switch (item.status) {
      case CourtStatus.ACTIVE:
        stats.active = count;
        break;
      case CourtStatus.SUSPENDED:
        stats.suspended = count;
        break;
      case CourtStatus.INACTIVE:
        stats.inactive = count;
        break;
      case CourtStatus.MAINTENANCE:
        stats.maintenance = count;
        break;
    }
  }

  return stats;
}

/**
 * Top sân được đặt nhiều nhất
 */
export async function getTopCourtsAdmin(limit = 5) {
  return prisma.booking.groupBy({
    by: ["courtId"],
    _count: true,
    orderBy: {
      _count: {
        courtId: "desc"
      }
    },
    take: limit
  });
}

/* =====================================================
   ================= TRAFFIC (VISIT)
===================================================== */

/**
 * Thống kê lượt truy cập
 */
interface VisitStats {
  totalVisits: number;
  uniqueUsers: number;
}
export async function getVisitStatsAdmin(
  startDate?: string,
  endDate?: string
): Promise<VisitStats> {
  const start = startDate ? new Date(startDate) : undefined;
  const end = endDate ? new Date(endDate) : undefined;

  const whereClause =
    start && end
      ? {
          createdAt: {
            gte: start,
            lte: end
          }
        }
      : {};

  const [totalVisits, uniqueUsers] = await Promise.all([
    prisma.visitLog.count({
      where: whereClause
    }),
    prisma.visitLog.groupBy({
      by: ["userId"],
      where: {
        ...whereClause,
        userId: {
          not: null
        }
      }
    }).then((res) => res.length)
  ]);

  return {
    totalVisits,
    uniqueUsers
  };
}

/**
 * Top route được truy cập
 */
export async function getTopVisitedRoutes(limit = 10) {
  return prisma.visitLog.groupBy({
    by: ["path"],
    _count: true,
    orderBy: {
      _count: {
        path: "desc"
      }
    },
    take: limit
  });
}

/* =====================================================
   ================= SYSTEM / AUDIT
===================================================== */

/**
 * Lấy audit logs
 */
export async function getAuditLogsAdmin(limit = 50) {
  return prisma.auditLog.findMany({
    include: {
      user: {
        select: {
          id: true,
          fullName: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: limit
  });
}

/**
 * Báo cáo hệ thống cơ bản
 */
export async function getSystemReportAdmin() {
  const [users, bookings, revenue, visits] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.booking.aggregate({
      _sum: { finalAmount: true }
    }),
    prisma.visitLog.count()
  ]);

  return {
    totalUsers: users,
    totalBookings: bookings,
    totalRevenue: Number(revenue._sum.finalAmount || 0),
    totalVisits: visits
  };
}