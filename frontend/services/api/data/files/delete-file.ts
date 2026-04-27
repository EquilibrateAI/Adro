import { url } from "@/services/api/api-url";

export type DeleteOk = { status: number; message: string };
export type DeleteErr = { status: number; message: string };

// Requests the backend to delete a specific uploaded file from storage
export async function deleteFile(fileName: string): Promise<DeleteOk> {
  try {
    const response = await fetch(`${url.backendUrl}/data/file-delete?file=${encodeURIComponent(fileName)}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      const err: DeleteErr = {
        status: response.status,
        message: data?.error || data?.message || "Deletion failed",
      };
      throw err;
    }

    return {
      status: response.status,
      message: data?.message ?? "Deleted successfully",
    };
  } catch (error) {
    if (error && (error as DeleteErr).message) {
      throw error;
    }
    throw new Error("api failed");
  }
}
