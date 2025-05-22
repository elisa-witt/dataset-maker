"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "../ui/label";
import { FormEventHandler, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function UserRegistrationModal() {
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");

  const ref = useRef<HTMLFormElement | null>(null);

  // Check if user exists on component mount
  useEffect(() => {
    const checkUserExists = async () => {
      try {
        setCheckingUser(true);

        const response = await fetch("/api/user/get-user", {
          method: "GET",
        });

        if (!response.ok) {
          // User doesn't exist, show registration modal
          setShowModal(true);
        }
      } catch (error) {
        // Error fetching user, assume user doesn't exist
        setShowModal(true);
      } finally {
        setCheckingUser(false);
      }
    };

    checkUserExists();
  }, []);

  const onRegisterUserHandler = () => {
    if (ref.current) {
      ref.current.requestSubmit();
    }
  };

  const onSubmitForm: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const fetchRegisterUser = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/user/register-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to register user");
        }

        toast("User registered successfully!");
        setShowModal(false);
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast(error.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRegisterUser();
  };

  // Don't render anything while checking user
  if (checkingUser) {
    return null;
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent
        className="font-[family-name:var(--font-geist-sans)]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Welcome! Let's get you started</DialogTitle>
          <DialogDescription>
            Please enter your username to create your account.
          </DialogDescription>
        </DialogHeader>

        <form ref={ref} onSubmit={onSubmitForm} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
              type="text"
              required
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="default"
            onClick={onRegisterUserHandler}
            disabled={loading || !username.trim()}
            className="cursor-pointer"
          >
            {loading ? (
              <>
                Registering...
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              </>
            ) : (
              "Register"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
