import { url } from "../api-url";

// Validates and saves the application's AI model and provider settings by pinging the backend
export const pingSettings = async (api_key: string, model_provider: string, port: string, model: string,baseUrl:string) => {
  try {
    const response = await fetch(`${url.backendUrl}/settings/ping`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key,
        model,
        model_provider,
        baseUrl,
        port,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    return data;

  } catch (error) {
    if (error instanceof Error && error.message !== "api failed") {
        throw error;
    }
    throw new Error("api failed");
  }
};
