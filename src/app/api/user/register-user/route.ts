import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ipAddress as getIpAddress } from "@vercel/functions";
import { PrismaClientKnownRequestError } from "@/generated/prisma/runtime/library";

// A helper function to create consistent error responses
function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    // Basic validation (you can expand this)
    if (!username) {
      return createErrorResponse("Username is required.", 400);
    }

    const ipAddress = getIpAddress(request);

    // Insert user into the database
    const newUser = await prismaClient.user.create({
      data: {
        username,
        ipAddress: ipAddress ?? "127.0.0.1", // Provide a default if IP is null
      },
    });

    // Return a success response with the created user's data (optional)
    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: unknown) {
    // Log the error for server-side debugging
    console.error("[API_ERROR] /api/user/register-user:", error);

    // Handle specific Prisma errors or other known errors if necessary
    // For example, if Prisma throws a unique constraint violation for username
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return createErrorResponse("Username already exists.", 409); // 409 Conflict
    }

    // For generic/unknown errors, return a 500 Internal Server Error
    // In production, you might want to avoid sending the raw error message
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred.";

    // For production, you might want a more generic message for 500 errors
    if (process.env.NODE_ENV === "production") {
      return createErrorResponse("An internal server error occurred.", 500);
    }

    return createErrorResponse(errorMessage, 500);
  }
}
