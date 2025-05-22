import { CreateWorkspace } from "@/components/functional/create-workspace";
import { WorkspacesGrid } from "@/components/functional/workspace-grid";

export default function MainPage() {
  return (
    <div className="flex flex-col gap-8 p-8 max-w-2xl font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col gap-4">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Dataset Organizer
        </h1>

        <CreateWorkspace />
      </div>

      <div className="w-full">
        <WorkspacesGrid />
      </div>
    </div>
  );
}
