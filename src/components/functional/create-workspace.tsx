"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "../ui/label";
import { FormEventHandler, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function CreateWorkspace() {
  const [loading, setLoading] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  const ref = useRef<HTMLFormElement | null>(null);

  const onCreateWorkspaceHandler = () => {
    if (ref.current) {
      ref.current.requestSubmit();
    }
  };

  const onSubmitForm: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const fetchCreateWorkspace = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/workspace/create-workspace", {
          method: "POST",
          body: JSON.stringify({
            workspace_name: workspaceName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error);
        }

        toast("Created Workspace");

        setTimeout(() => window.location.reload(), 1500);
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCreateWorkspace();
  };

  return (
    <>
      <Dialog>
        <DialogTrigger
          asChild
          className="font-[family-name:var(--font-geist-sans)] max-w-xs"
        >
          <Button variant="default" className="cursor-pointer">
            Create Workspace
          </Button>
        </DialogTrigger>
        <DialogContent className="font-[family-name:var(--font-geist-sans)]">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <form ref={ref} onSubmit={onSubmitForm} className="space-y-3">
            <Label>Workspace Name</Label>
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.currentTarget.value)}
              type="text"
              required
              placeholder="Your Workspace"
            />
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="default"
              onClick={onCreateWorkspaceHandler}
              disabled={loading}
              className="cursor-pointer"
            >
              Create Workspace
              {loading && <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
