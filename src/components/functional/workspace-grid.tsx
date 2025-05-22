"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Workspace {
  id: string;
  workspaceName: string;
  workspaceId: string;
  createdAt?: string;
  updatedAt?: string;
}

export function WorkspacesGrid() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/workspace/get-all-workspaces", {
          method: "GET",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch workspaces");
        }

        setWorkspaces(data.workspaces || data || []);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load workspaces";
        setError(errorMessage);
        toast(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleWorkspaceClick = (workspace: Workspace) => {
    // Handle workspace selection/navigation here
    console.log("Selected workspace:", workspace);
    // You can add navigation logic here, e.g.:
    router.push(`/workspace/${workspace.workspaceId}`);
  };

  return (
    <div className="w-full space-y-6 font-[family-name:var(--font-geist-sans)]">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground">
          Select a workspace to get started or create a new one.
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-muted-foreground">Loading workspaces...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-destructive font-medium">
              Failed to load workspaces
            </p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && workspaces.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground font-medium">
              No workspaces found
            </p>
            <p className="text-sm text-muted-foreground">
              Create your first workspace to get started.
            </p>
          </div>
        </div>
      )}

      {/* Workspaces Grid */}
      {!loading && !error && workspaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              onClick={() => handleWorkspaceClick(workspace)}
              className="group relative p-6 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 cursor-pointer"
            >
              {/* Workspace Icon/Avatar */}
              <div className="mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {workspace.workspaceName.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Workspace Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground group-hover:text-accent-foreground transition-colors">
                  {workspace.workspaceName}
                </h3>

                {workspace.createdAt && (
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(workspace.createdAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-lg ring-2 ring-primary/0 group-hover:ring-primary/20 transition-all duration-200" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
