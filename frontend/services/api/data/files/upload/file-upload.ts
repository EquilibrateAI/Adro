import { url } from "@/services/api/api-url";

export type UploadOk = { status: number; message: string };
export type UploadErr = { status: number; message: string };

// Handles multi-part file uploads with optional metadata to the server
export async function uploadFile(file: File, metadataText?: string): Promise<UploadOk> {
  const formData = new FormData();
  formData.append("file", file);

  // Send metadata typed in the textarea (JSON string)
  if (metadataText && metadataText.trim().length > 0) {
    formData.append("metadata", metadataText.trim());
  } 

  const uploadUrl = `${url.backendUrl}/data/file_upload`;

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData, 
    });

    const data = await response.json();

    if (!response.ok) {
      const err: UploadErr = {
        status: response.status,
        message: data?.error || data?.message || "Upload failed",
      };
      throw err;
    }

    return {
      status: response.status,
      message: data?.message ?? "Uploaded",
    };
  } catch (error) {
    if (error && (error as UploadErr).message) {
      throw error;
    }
    console.error("[ERROR] Upload failed with URL:", uploadUrl, "Error:", error);
    throw new Error("api failed");
  }
}
