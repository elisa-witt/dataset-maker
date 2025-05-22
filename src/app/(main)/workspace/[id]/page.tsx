import { ChatCard } from "@/components/functional/chat-card";
import { WorkspacePage } from "@/components/functional/workspace-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="w-full max-w-2xl h-screen flex p-4">
      <WorkspacePage workspaceId={id} />
    </div>
  );
}
