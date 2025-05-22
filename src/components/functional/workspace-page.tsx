"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Database,
  Wrench,
  Calendar,
  Plus,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Dataset {
  id: string;
  datasetId: string;
  name?: string;
  description?: string;
  purpose: string;
  model?: string;
  status: string;
  exportCount: number;
  lastExportAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    trainingConversations: number;
  };
}

interface Tool {
  id: string;
  toolName: string;
  description?: string;
  parameters?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Workspace {
  id: string;
  workspaceId: string;
  workspaceName: string;
  createdAt: string;
  updatedAt: string;
  datasets: Dataset[];
  tools: Tool[];
}

interface WorkspacePageProps {
  workspaceId: string;
}

export function WorkspacePage({ workspaceId }: WorkspacePageProps) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);
  const [creatingDataset, setCreatingDataset] = useState(false);
  const [creatingTool, setCreatingTool] = useState(false);

  const router = useRouter();

  // Dataset form state
  const [datasetForm, setDatasetForm] = useState({
    name: "",
    description: "",
    purpose: "fine-tune",
    model: "",
  });

  // Tool form state
  const [toolForm, setToolForm] = useState({
    toolName: "",
    description: "",
    parameters: "",
  });

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/workspace/get-workspace", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            workspace_id: workspaceId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch workspace");
        }

        setWorkspace(data.workspace || data);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to load workspace";
        setError(errorMessage);
        toast(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      fetchWorkspace();
    }
  }, [workspaceId]);

  const createDataset = async () => {
    if (!workspaceId) return;

    setCreatingDataset(true);
    try {
      const response = await fetch("/api/dataset/create-dataset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          ...datasetForm,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create dataset");
      }

      // Add new dataset to workspace
      if (workspace) {
        setWorkspace({
          ...workspace,
          datasets: [data.dataset || data, ...workspace.datasets],
        });
      }

      setShowDatasetModal(false);
      setDatasetForm({
        name: "",
        description: "",
        purpose: "fine-tune",
        model: "",
      });
      toast("Dataset created successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create dataset";
      toast(errorMessage);
    } finally {
      setCreatingDataset(false);
    }
  };

  const createTool = async () => {
    if (!workspaceId) return;

    setCreatingTool(true);
    try {
      let parsedParameters = null;
      if (toolForm.parameters.trim()) {
        try {
          parsedParameters = JSON.parse(toolForm.parameters);
        } catch {
          throw new Error("Invalid JSON in parameters field");
        }
      }

      const response = await fetch("/api/tool/create-tool", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          toolName: toolForm.toolName,
          description: toolForm.description,
          parameters: parsedParameters
            ? JSON.stringify(parsedParameters)
            : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create tool");
      }

      // Add new tool to workspace
      if (workspace) {
        setWorkspace({
          ...workspace,
          tools: [data.tool || data, ...workspace.tools],
        });
      }

      setShowToolModal(false);
      setToolForm({ toolName: "", description: "", parameters: "" });
      toast("Tool created successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create tool";
      toast(errorMessage);
    } finally {
      setCreatingTool(false);
    }
  };

  const deleteDataset = async (datasetId: string) => {
    try {
      const response = await fetch("/api/dataset/delete-dataset", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataset_id: datasetId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete dataset");
      }

      // Remove dataset from workspace
      if (workspace) {
        setWorkspace({
          ...workspace,
          datasets: workspace.datasets.filter((d) => d.id !== datasetId),
        });
      }

      toast("Dataset deleted successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete dataset";
      toast(errorMessage);
    }
  };

  const deleteTool = async (toolId: string) => {
    try {
      const response = await fetch("/api/tool/delete-tool", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tool_id: toolId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete tool");
      }

      // Remove tool from workspace
      if (workspace) {
        setWorkspace({
          ...workspace,
          tools: workspace.tools.filter((t) => t.id !== toolId),
        });
      }

      toast("Tool deleted successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete tool";
      toast(errorMessage);
    }
  };

  const openChatSimulation = (dataset: Dataset) => {
    router.push(`/dataset/${dataset.id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "training":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "draft":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">
            Failed to load workspace
          </p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 font-[family-name:var(--font-geist-sans)]">
      {/* Workspace Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              {workspace.workspaceName}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(workspace.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Database className="h-4 w-4" />
                <span>{workspace.datasets.length} datasets</span>
              </div>
              <div className="flex items-center space-x-1">
                <Wrench className="h-4 w-4" />
                <span>{workspace.tools.length} tools</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Datasets Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Datasets</h2>
          <Dialog open={showDatasetModal} onOpenChange={setShowDatasetModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Dataset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Dataset</DialogTitle>
                <DialogDescription>
                  Create a new dataset for training conversations and
                  fine-tuning models.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dataset-name">Name</Label>
                  <Input
                    id="dataset-name"
                    value={datasetForm.name}
                    onChange={(e) =>
                      setDatasetForm({ ...datasetForm, name: e.target.value })
                    }
                    placeholder="Dataset name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-description">Description</Label>
                  <Textarea
                    id="dataset-description"
                    value={datasetForm.description}
                    onChange={(e) =>
                      setDatasetForm({
                        ...datasetForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Dataset description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-purpose">Purpose</Label>
                  <Select
                    value={datasetForm.purpose}
                    onValueChange={(value) =>
                      setDatasetForm({ ...datasetForm, purpose: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fine-tune">Fine-tune</SelectItem>
                      <SelectItem value="chat-completion">
                        Chat Completion
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-model">Target Model (Optional)</Label>
                  <Input
                    id="dataset-model"
                    value={datasetForm.model}
                    onChange={(e) =>
                      setDatasetForm({ ...datasetForm, model: e.target.value })
                    }
                    placeholder="e.g., gpt-3.5-turbo, gpt-4"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createDataset}
                  disabled={creatingDataset || !datasetForm.name.trim()}
                >
                  {creatingDataset ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Dataset"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {workspace.datasets.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">
              No datasets found
            </p>
            <p className="text-sm text-muted-foreground">
              Create your first dataset to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.datasets.map((dataset) => (
              <div
                key={dataset.id}
                className="p-6 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-foreground">
                        {dataset.name ||
                          `Dataset ${dataset.datasetId.slice(0, 8)}`}
                      </h3>
                      {dataset.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {dataset.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <Badge className={getStatusColor(dataset.status)}>
                        {dataset.status}
                      </Badge>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDataset(dataset.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Purpose:</span>
                      <span className="font-medium">{dataset.purpose}</span>
                    </div>
                    {dataset.model && (
                      <div className="flex justify-between">
                        <span>Model:</span>
                        <span className="font-medium">{dataset.model}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Exports:</span>
                      <span className="font-medium">{dataset.exportCount}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Created At {formatDate(dataset.createdAt)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openChatSimulation(dataset)}
                      className="w-full cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Chat
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tools Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Tools</h2>
          <Dialog open={showToolModal} onOpenChange={setShowToolModal}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Tool
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tool</DialogTitle>
                <DialogDescription>
                  Add a new tool to enhance your workspace capabilities.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tool-name">Tool Name</Label>
                  <Input
                    id="tool-name"
                    value={toolForm.toolName}
                    onChange={(e) =>
                      setToolForm({ ...toolForm, toolName: e.target.value })
                    }
                    placeholder="Tool name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tool-description">Description</Label>
                  <Textarea
                    id="tool-description"
                    value={toolForm.description}
                    onChange={(e) =>
                      setToolForm({ ...toolForm, description: e.target.value })
                    }
                    placeholder="Tool description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tool-parameters">
                    Parameters (JSON Schema)
                  </Label>
                  <Textarea
                    id="tool-parameters"
                    value={toolForm.parameters}
                    onChange={(e) =>
                      setToolForm({ ...toolForm, parameters: e.target.value })
                    }
                    placeholder='{"type": "object", "properties": {...}}'
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={createTool}
                  disabled={creatingTool || !toolForm.toolName.trim()}
                >
                  {creatingTool ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Tool"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {workspace.tools.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No tools found</p>
            <p className="text-sm text-muted-foreground">
              Add your first tool to enhance your workspace.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspace.tools.map((tool) => (
              <div
                key={tool.id}
                className="p-6 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-semibold text-foreground">
                        {tool.toolName}
                      </h3>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {tool.description}
                        </p>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTool(tool.id);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Usage count:</span>
                      <span className="font-medium">{tool.usageCount}</span>
                    </div>
                    {tool.parameters && (
                      <div className="space-y-1">
                        <span>Parameters:</span>
                        <div className="bg-muted p-2 rounded text-xs font-mono max-h-20 overflow-y-auto">
                          {JSON.stringify(JSON.parse(tool.parameters), null, 2)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(tool.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
