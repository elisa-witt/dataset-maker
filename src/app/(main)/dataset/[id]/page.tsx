import { ChatCard } from "@/components/functional/chat-card";
import { prismaClient } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const dataset = await prismaClient.dataset.findFirst({
    where: {
      id: id,
    },
  });

  if (!dataset) {
    return notFound();
  }

  return <ChatCard datasetId={dataset.datasetId} />;
}
