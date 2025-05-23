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
  Download,
  MoreVertical,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Checkbox } from "../ui/checkbox";

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
  apiUrl?: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ToolCallInput {
  id: string; // For OpenAI spec, this is the call_id
  function: {
    name: string;
    arguments: string; // JSON string of arguments
  };
  type: "function";
}

interface ParameterDefinition {
  id: string; // For unique key in React lists
  name: string;
  type: "string" | "number" | "boolean"; // Extend with 'integer', 'array' as needed
  description: string;
  isRequired: boolean;
  enumValuesStr: string; // Comma-separated string for enums (if type is 'string')
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

  // ... other state variables
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedDatasetForExport, setSelectedDatasetForExport] =
    useState<Dataset | null>(null);
  const [exportFormat, setExportFormat] = useState<"json" | "jsonl">("json");
  const [exportingDataset, setExportingDataset] = useState(false);

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
    // parameters: "", // Keep this if you want to show the generated JSON, or remove
    structuredParameters: [] as ParameterDefinition[], // New field for UI-driven params
    apiUrl: "",
    httpMethod: "", // Make sure this is handled in your createTool logic if needed
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
      // Transform structured parameters to JSON string schema
      const parametersJsonString = transformStructuredParametersToSchema(
        toolForm.structuredParameters
      );

      // Validate if toolName is present
      if (!toolForm.toolName.trim()) {
        throw new Error("Tool Name is required.");
      }

      const response = await fetch(`/api/workspace/${workspaceId}/tools`, {
        // Ensure this API endpoint is correct
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // workspace_id: workspaceId, // The API route already gets workspaceId from path params
          toolName: toolForm.toolName,
          description: toolForm.description,
          parameters: parametersJsonString || null, // Send null or empty object if no params
          apiUrl: toolForm.apiUrl,
          // httpMethod: toolForm.httpMethod, // Add if your backend uses this
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create tool");
      }

      if (workspace) {
        setWorkspace({
          ...workspace,
          tools: [data.tool || data, ...workspace.tools],
        });
      }

      setShowToolModal(false);
      // Reset tool form, including structuredParameters
      setToolForm({
        toolName: "",
        description: "",
        structuredParameters: [],
        apiUrl: "",
        httpMethod: "",
      });
      toast.success("Tool created successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create tool";
      toast.error(errorMessage);
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

  // Add this function inside WorkspacePage component
  const handleExportDataset = async (
    datasetIdToExport: string,
    selectedFormat: "json" | "jsonl"
  ) => {
    if (!datasetIdToExport) return;

    setExportingDataset(true);
    toast.info(`Exporting dataset as ${selectedFormat.toUpperCase()}...`);

    try {
      const response = await fetch(
        `/api/dataset/${datasetIdToExport}/export?format=${selectedFormat}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        let errorData = {
          error: `Failed to export dataset. Status: ${response.status}`,
        };
        try {
          // Try to parse as JSON, but don't fail if it's not
          errorData = await response.json();
        } catch (jsonError) {
          console.warn("Response was not JSON:", await response.text());
        }
        throw new Error(
          errorData.error ||
            `Failed to export dataset. Status: ${response.status}`
        );
      }

      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `dataset_${datasetIdToExport}.${selectedFormat}`; // Default filename
      if (contentDisposition) {
        const matches = filenameRegex.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, "");
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Dataset exported successfully!");

      // Optionally, refetch workspace data to update exportCount and lastExportAt display
      // This depends on how you manage state updates (e.g., fetchWorkspace())
      // For simplicity, we'll assume a manual refresh or a more sophisticated state management might be in place.
      // You could also update the specific dataset in the local 'workspace' state if the API returned the updated dataset info.
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to export dataset";
      toast.error(errorMessage);
    } finally {
      setExportingDataset(false);
      setShowExportModal(false); // Close modal if using one
      setSelectedDatasetForExport(null);
    }
  };

  function transformStructuredParametersToSchema(
    params: ParameterDefinition[]
  ): string {
    if (params.length === 0) {
      return ""; // Or return JSON.stringify({}) if an empty object is preferred
    }

    const properties: Record<string, any> = {};
    const required: string[] = [];

    params.forEach((param) => {
      if (!param.name.trim()) return; // Skip if name is empty

      const propertyDefinition: any = {
        type: param.type,
        description: param.description.trim() || undefined, // Omit if empty
      };

      if (param.type === "string" && param.enumValuesStr.trim()) {
        propertyDefinition.enum = param.enumValuesStr
          .split(",")
          .map((e) => e.trim())
          .filter((e) => e);
        if (propertyDefinition.enum.length === 0) {
          delete propertyDefinition.enum;
        }
      }

      properties[param.name.trim()] = propertyDefinition;

      if (param.isRequired) {
        required.push(param.name.trim());
      }
    });

    if (Object.keys(properties).length === 0) {
      return ""; // Or JSON.stringify({})
    }

    const schema = {
      type: "object",
      properties,
      ...(required.length > 0 && { required }),
    };

    return JSON.stringify(schema, null, 2);
  }

  // Add these handlers inside WorkspacePage component
  const handleAddParameter = () => {
    setToolForm((prev) => ({
      ...prev,
      structuredParameters: [
        ...prev.structuredParameters,
        {
          id: Date.now().toString(),
          name: "",
          type: "string",
          description: "",
          isRequired: false,
          enumValuesStr: "",
        },
      ],
    }));
  };

  const handleRemoveParameter = (id: string) => {
    setToolForm((prev) => ({
      ...prev,
      structuredParameters: prev.structuredParameters.filter(
        (p) => p.id !== id
      ),
    }));
  };

  const handleParameterChange = (
    id: string,
    field: keyof ParameterDefinition,
    value: string | boolean
  ) => {
    setToolForm((prev) => ({
      ...prev,
      structuredParameters: prev.structuredParameters.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    }));
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

            <Dialog
              open={showExportModal}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setSelectedDatasetForExport(null);
                }
                setShowExportModal(isOpen);
              }}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Export Dataset:{" "}
                    {selectedDatasetForExport && selectedDatasetForExport.name}
                  </DialogTitle>
                  <DialogDescription>
                    Select the format for your dataset export.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select
                    value={exportFormat}
                    onValueChange={(value: "json" | "jsonl") =>
                      setExportFormat(value)
                    }
                  >
                    <SelectTrigger id="export-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="jsonl">JSONL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowExportModal(false);
                      setSelectedDatasetForExport(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedDatasetForExport) {
                        handleExportDataset(
                          selectedDatasetForExport.datasetId,
                          exportFormat
                        );
                      }
                    }}
                    disabled={exportingDataset}
                  >
                    {exportingDataset ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Export as {exportFormat.toUpperCase()}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <DropdownMenu modal={false}>
                          {" "}
                          {/* Add modal={false} here */}
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                // It's good practice to use onSelect for DropdownMenuItems if they perform an action
                                // and you want the menu to close, which is default.
                                // onClick is fine here too but onSelect is more semantically aligned with Radix.
                                e.stopPropagation(); // Keep if needed for other card interactions, though usually not necessary for menu items.
                                setSelectedDatasetForExport(dataset);
                                setShowExportModal(true);
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" /> Export
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-700/20 dark:focus:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDataset(dataset.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                      <span className="font-medium">
                        {dataset.exportCount ?? 0}
                      </span>
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
                  <Label htmlFor="tool-api-url">API URL (Optional)</Label>
                  <Input
                    id="tool-api-url"
                    value={toolForm.apiUrl}
                    onChange={(e) =>
                      setToolForm({ ...toolForm, apiUrl: e.target.value })
                    }
                    placeholder="https://api.example.com/mytool"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full gap-4">
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

                  {/* Replace the existing Parameters Textarea with this section */}
                  <div className="space-y-2">
                    <div className="flex flex-col gap-3 justify-start items-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddParameter}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Parameter
                      </Button>
                      <Label>Parameters</Label>
                    </div>
                    {toolForm.structuredParameters.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No parameters defined. Click &quot;Add Parameter&quot;
                        to add one.
                      </p>
                    )}
                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                      {toolForm.structuredParameters.map((param, index) => (
                        <div
                          key={param.id}
                          className="p-3 border rounded-md space-y-3 bg-muted/30 relative"
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => handleRemoveParameter(param.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`param-name-${index}`}>
                                Name
                              </Label>
                              <Input
                                id={`param-name-${index}`}
                                value={param.name}
                                onChange={(e) =>
                                  handleParameterChange(
                                    param.id,
                                    "name",
                                    e.target.value
                                  )
                                }
                                placeholder="Parameter name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`param-type-${index}`}>
                                Type
                              </Label>
                              <Select
                                value={param.type}
                                onValueChange={(
                                  value: "string" | "number" | "boolean"
                                ) =>
                                  handleParameterChange(param.id, "type", value)
                                }
                              >
                                <SelectTrigger id={`param-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="string">String</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="boolean">
                                    Boolean
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`param-desc-${index}`}>
                              Description
                            </Label>
                            <Input
                              id={`param-desc-${index}`}
                              value={param.description}
                              onChange={(e) =>
                                handleParameterChange(
                                  param.id,
                                  "description",
                                  e.target.value
                                )
                              }
                              placeholder="Parameter description"
                            />
                          </div>
                          {param.type === "string" && (
                            <div className="space-y-1">
                              <Label htmlFor={`param-enum-${index}`}>
                                Enum Values (comma-separated)
                              </Label>
                              <Input
                                id={`param-enum-${index}`}
                                value={param.enumValuesStr}
                                onChange={(e) =>
                                  handleParameterChange(
                                    param.id,
                                    "enumValuesStr",
                                    e.target.value
                                  )
                                }
                                placeholder="e.g., value1,value2,value3"
                              />
                            </div>
                          )}
                          <div className="flex items-center space-x-2 pt-1">
                            <Checkbox
                              id={`param-required-${index}`}
                              checked={param.isRequired}
                              onCheckedChange={(checked) =>
                                handleParameterChange(
                                  param.id,
                                  "isRequired",
                                  !!checked
                                )
                              }
                            />
                            <Label
                              htmlFor={`param-required-${index}`}
                              className="font-normal"
                            >
                              Required
                            </Label>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Optional: Display the generated JSON for review */}
                    {toolForm.structuredParameters.length > 0 && (
                      <div className="space-y-1 mt-4">
                        <Label>Generated JSON Schema (for review)</Label>
                        <Textarea
                          readOnly
                          value={
                            transformStructuredParametersToSchema(
                              toolForm.structuredParameters
                            ) || "Define parameters to see schema..."
                          }
                          className="font-mono text-xs h-24 bg-muted/50"
                        />
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
