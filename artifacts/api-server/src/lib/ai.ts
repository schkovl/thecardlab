import OpenAI from "openai";

let _client: OpenAI | null | undefined;

export function getAIClient(): OpenAI | null {
  if (_client !== undefined) return _client;
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const directKey = process.env.OPENAI_API_KEY;
  if (baseUrl && integrationKey) {
    _client = new OpenAI({ apiKey: integrationKey, baseURL: baseUrl });
  } else if (directKey) {
    _client = new OpenAI({ apiKey: directKey });
  } else {
    _client = null;
  }
  return _client;
}

export function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw;
}
