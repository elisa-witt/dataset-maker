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
import { FormEventHandler, useState } from "react";
import { Loader2 } from "lucide-react";

export function CreateWorkspace() {
  const [loading, setLoading] = useState(false);

  const onCreateWorkspaceHandler = () => {
    const fetchCreateWorkspace = async () => {
      try {
        setLoading(true);
      } catch (error: unknown) {
      } finally {
        setLoading(false);
      }
    };

    fetchCreateWorkspace();
  };

  const onSubmitForm: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
  };

  return (
    <>
      <Dialog>
        <DialogTrigger
          asChild
          className="font-[family-name:var(--font-geist-sans)]"
        >
          <Button variant="default" className="cursor-pointer">
            Create Workspace
          </Button>
        </DialogTrigger>
        <DialogContent className="font-[family-name:var(--font-geist-sans)]">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={} className="space-y-3">
            <Label>Workspace Name</Label>
            <Input type="text" placeholder="Your Workspace" />
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="default"
              onClick={onCreateWorkspaceHandler}
              disabled={loading}
            >
              Create Workspace
              {loading && <Loader2 />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
