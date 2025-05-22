import { NextRequest } from "next/server";
import { ipAddress as getIpAddress } from "@vercel/functions";
import { prismaClient } from "./prisma";

export async function getUserFromIpAddress(request: NextRequest) {
  // get client ip address
  const ipAddress = getIpAddress(request);

  // get client record on database
  const record = await prismaClient.user.findFirst({
    where: {
      ipAddress,
    },
  });

  return record;
}
