import { NextResponse } from "next/server";
import { prisma } from "@/infra/db/prisma";

export async function GET() {
  let databaseStatus = "disconnected";
  let databaseError = null;

  try {
    // Run a simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "connected";
  } catch (error: any) {
    console.error("Database health check failed:", error);
    databaseStatus = "failed";
    databaseError = error.message || String(error);
  }

  return NextResponse.json({
    status: databaseStatus === "connected" ? "ok" : "error",
    database: {
      status: databaseStatus,
      error: databaseError,
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

