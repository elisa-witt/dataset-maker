import { ChatCard } from "@/components/functional/chat-card";
import ConversationManager from "@/components/functional/conversation-manager";

export default function CreatorPage() {
  return (
    <div className="w-full max-w-2xl h-screen flex p-4">
      <ChatCard datasetId="1234" />
      {/* <ConversationManager datasetId="412sdf" /> */}
    </div>
  );
}
