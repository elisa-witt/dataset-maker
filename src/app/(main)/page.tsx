import { CreateWorkspace } from "@/components/functional/create-workspace";

export default function MainPage() {
  return (
    <div className="flex flex-col gap-2 p-8 max-w-md font-[family-name:var(--font-geist-sans)]">
      <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
        Dataset Organizer
      </h1>

      <CreateWorkspace />
    </div>
  );
}
