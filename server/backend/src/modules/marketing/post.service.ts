import { prisma } from "@/infra/db/prisma";
import { PostStatus, PostType, Prisma } from "@/generated/prisma";
import { notifyPlayersAboutOwnerPost } from "@/modules/user/notification.service";

export const POST_TITLE_MAX = 200;
export const POST_CONTENT_MAX = 20000;

function assertLengths(title: string, content: string) {
  const t = title?.trim() ?? "";
  const c = content?.trim() ?? "";
  if (!t.length || !c.length) throw new Error("TITLE_CONTENT_REQUIRED");
  if (t.length > POST_TITLE_MAX) throw new Error("TITLE_TOO_LONG");
  if (c.length > POST_CONTENT_MAX) throw new Error("CONTENT_TOO_LONG");
}

function slugifyTitle(title: string): string {
  const s = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return s || "bai-dang";
}

async function ensureUniqueSlug(clubId: string, base: string, excludePostId?: string): Promise<string> {
  let slug = base;
  let n = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.post.findFirst({
      where: {
        clubId,
        slug,
        ...(excludePostId ? { NOT: { id: excludePostId } } : {}),
      },
      select: { id: true },
    });
    if (!clash) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

async function attachCourtNames<T extends { linkedCourtId: string | null }>(
  posts: T[]
): Promise<(T & { courtName: string | null })[]> {
  const ids = [...new Set(posts.map((p) => p.linkedCourtId).filter(Boolean))] as string[];
  if (!ids.length) {
    return posts.map((p) => ({ ...p, courtName: null }));
  }
  const courts = await prisma.court.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  const map = Object.fromEntries(courts.map((c) => [c.id, c.name]));
  return posts.map((p) => ({
    ...p,
    courtName: p.linkedCourtId ? map[p.linkedCourtId] ?? null : null,
  }));
}

export async function createPost(
  clubId: string,
  ownerId: string,
  data: {
    type: PostType;
    title: string;
    content: string;
    imageUrl?: string;
    linkedCourtId?: string;
    linkedDate?: Date;
    expiresAt?: Date;
  }
) {
  assertLengths(data.title, data.content);

  const club = await prisma.club.findFirst({
    where: { id: clubId, ownerId },
    select: { id: true, name: true },
  });
  if (!club) throw new Error("CLUB_NOT_FOUND_OR_UNAUTHORIZED");

  const base = slugifyTitle(data.title);
  const slug = await ensureUniqueSlug(club.id, base);

  const post = await prisma.post.create({
    data: {
      clubId,
      slug,
      type: data.type,
      status: "PENDING",
      title: data.title.trim(),
      content: data.content.trim(),
      imageUrl: data.imageUrl?.trim() || undefined,
      linkedCourtId: data.linkedCourtId,
      linkedDate: data.linkedDate,
      expiresAt: data.expiresAt,
    },
  });

  return { post, notificationsSent: 0 };
}

export async function updatePost(
  postId: string,
  requesterId: string,
  data: {
    type?: PostType;
    title?: string;
    content?: string;
    imageUrl?: string | null;
    linkedCourtId?: string | null;
    linkedDate?: Date | null;
    expiresAt?: Date | null;
  }
) {
  const existing = await prisma.post.findFirst({
    where: { 
      id: postId, 
      OR: [
        { club: { ownerId: requesterId } },
        { userId: requesterId }
      ]
    },
  });
  if (!existing) throw new Error("POST_NOT_FOUND_OR_UNAUTHORIZED");

  const title = data.title !== undefined ? data.title : existing.title;
  const content = data.content !== undefined ? data.content : existing.content;
  assertLengths(title, content);

  let slug = existing.slug;
  if (data.title !== undefined && data.title.trim() !== existing.title) {
    const base = slugifyTitle(title);
    slug = await ensureUniqueSlug(existing.clubId, base, postId);
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      title: title.trim(),
      content: content.trim(),
      slug,
      ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl?.trim() || null } : {}),
      ...(data.linkedCourtId !== undefined ? { linkedCourtId: data.linkedCourtId } : {}),
      ...(data.linkedDate !== undefined ? { linkedDate: data.linkedDate } : {}),
      ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
    },
  });

  return updated;
}

export async function createUserPost(
  userId: string,
  data: {
    clubId: string; // The club they are posting about
    type: PostType;
    title: string;
    content: string;
    imageUrl?: string;
    linkedCourtId?: string;
    linkedDate?: Date;
    expiresAt?: Date;
  }
) {
  assertLengths(data.title, data.content);

  const base = slugifyTitle(data.title);
  const slug = await ensureUniqueSlug(data.clubId, base);

  const post = await prisma.post.create({
    data: {
      clubId: data.clubId,
      userId,
      slug,
      type: data.type,
      status: "ACTIVE", // Auto-active for users, or maybe PENDING? Let's make it ACTIVE for now to see immediately.
      title: data.title.trim(),
      content: data.content.trim(),
      imageUrl: data.imageUrl?.trim() || undefined,
      linkedCourtId: data.linkedCourtId,
      linkedDate: data.linkedDate,
      expiresAt: data.expiresAt,
    },
  });

  return { post, notificationsSent: 0 };
}

export async function incrementPostView(postId: string) {
  const r = await prisma.post.updateMany({
    where: { id: postId, status: "ACTIVE", deletedAt: null },
    data: { viewCount: { increment: 1 } },
  });
  return r.count > 0;
}
export async function togglePostLike(postId: string, userId: string) {
  const existing = await prisma.postLike.findUnique({
    where: {
      postId_userId: { postId, userId }
    }
  });

  if (existing) {
    await prisma.postLike.delete({
      where: { id: existing.id }
    });
    return { liked: false };
  } else {
    await prisma.postLike.create({
      data: { postId, userId }
    });
    return { liked: true };
  }
}


export async function getPostById(postId: string, userId?: string) {
  const post = await prisma.post.findFirst({
    where: {
      id: postId,
      status: "ACTIVE",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    include: {
      club: { 
        select: { 
          id: true, 
          name: true, 
          logoUrl: true, 
          address: true, 
          slug: true,
          ownerId: true,
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          }
        } 
      },
      _count: {
        select: { comments: true, likes: true }
      },
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true }
          }
        }
      },
      user: {
        select: { id: true, fullName: true, avatarUrl: true }
      }
    },
  });
  if (!post) return null;
  const [row] = await attachCourtNames([post]);
  const [final] = await enrichPostsWithLikes([row], userId);
  return final;
}

export async function getPostByClubSlug(clubSlug: string, postSlug: string, userId?: string) {
  const club = await prisma.club.findFirst({
    where: { slug: clubSlug, deletedAt: null },
    select: { id: true },
  });
  if (!club) return null;

  const post = await prisma.post.findFirst({
    where: {
      clubId: club.id,
      slug: postSlug,
      status: "ACTIVE",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    include: {
      club: { 
        select: { 
          id: true, 
          name: true, 
          logoUrl: true, 
          address: true, 
          slug: true,
          ownerId: true,
          images: {
            select: { url: true },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          }
        } 
      },
      _count: {
        select: { comments: true, likes: true }
      },
      participants: {
        include: {
          user: {
            select: { id: true, fullName: true, avatarUrl: true }
          }
        }
      },
      user: {
        select: { id: true, fullName: true, avatarUrl: true }
      }
    },
  });
  if (!post) return null;
  const [row] = await attachCourtNames([post]);
  const [final] = await enrichPostsWithLikes([row], userId);
  return final;
}

export async function enrichPostsWithLikes<T extends { id: string }>(posts: T[], userId?: string) {
  if (!userId || !posts.length) return posts;
  const postIds = posts.map(p => p.id);
  const likes = await prisma.postLike.findMany({
    where: { postId: { in: postIds }, userId },
    select: { postId: true }
  });
  const likedSet = new Set(likes.map(l => l.postId));
  return posts.map(p => ({
    ...p,
    isLikedByUser: likedSet.has(p.id)
  }));
}


export async function getPosts(filters: {
  clubId?: string;
  userId?: string;
  type?: PostType;
  isUser?: boolean;
  page?: number;
  limit?: number;
  currentUserId?: string;
}) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const rawLimit = filters.limit && filters.limit > 0 ? filters.limit : 0;
  const limit = rawLimit > 0 ? Math.min(rawLimit, 100) : 0;
  const usePaging = limit > 0;

  const where: Prisma.PostWhereInput = {
    deletedAt: null,
    ...(filters.clubId && { clubId: filters.clubId }),
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.type && { type: filters.type }),
    ...(filters.isUser
      ? {
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        }
      : {}),
  };

  const includeClub = {
    club: { 
      select: { 
        id: true, 
        name: true, 
        logoUrl: true, 
        address: true, 
        slug: true,
        ownerId: true,
        images: {
          select: { url: true },
          orderBy: { sortOrder: 'asc' as const },
          take: 1,
        }
      } 
    },
    user: {
      select: { id: true, fullName: true, avatarUrl: true }
    },
    _count: {
      select: { comments: true, likes: true }
    }
  } satisfies Prisma.PostInclude;

  if (!filters.isUser) {
    if (usePaging) {
      const total = await prisma.post.count({ where });
      const posts = await prisma.post.findMany({
        where,
        include: includeClub,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
      const items = await attachCourtNames(posts);
      const enriched = await enrichPostsWithLikes(items, filters.currentUserId);
      return { items: enriched, total, page, limit };
    }
    const posts = await prisma.post.findMany({
      where,
      include: includeClub,
      orderBy: { createdAt: "desc" },
    });
    const items = await attachCourtNames(posts);
    return enrichPostsWithLikes(items, filters.currentUserId);
  }

  // User feed
  if (usePaging) {
    const total = await prisma.post.count({ where });
    const posts = await prisma.post.findMany({
      where,
      include: includeClub,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });
    const items = await attachCourtNames(posts);
    const enriched = await enrichPostsWithLikes(items, filters.currentUserId);
    return { items: enriched, total, page, limit };
  }

  const posts = await prisma.post.findMany({
    where,
    include: includeClub,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const enriched = await attachCourtNames(posts);
  return enrichPostsWithLikes(enriched, filters.currentUserId);
}

export async function deletePost(postId: string, requesterId: string) {
  const post = await prisma.post.findFirst({
    where: { 
      id: postId, 
      OR: [
        { club: { ownerId: requesterId } },
        { userId: requesterId }
      ]
    },
  });

  if (!post) throw new Error("POST_NOT_FOUND_OR_UNAUTHORIZED");

  return prisma.post.delete({
    where: { id: postId },
  });
}

export async function getCommentsByPostId(postId: string) {
  return prisma.comment.findMany({
    where: { postId, isHidden: false },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function addComment(params: {
  postId: string;
  userId: string;
  content: string;
}) {
  return prisma.comment.create({
    data: {
      postId: params.postId,
      userId: params.userId,
      content: params.content,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });
}
