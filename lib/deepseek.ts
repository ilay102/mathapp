import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY;

export const deepseek = new OpenAI({
  apiKey: apiKey ?? "missing-key",
  baseURL: "https://api.deepseek.com/v1",
});

export const MODELS = {
  flash: "deepseek-v4-flash",
  pro: "deepseek-v4-pro",
} as const;

export function assertKey() {
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set. Add it to .env.local");
}
