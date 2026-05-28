export const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export type JsonSchema = Record<string, unknown>;

export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  responseSchema?: JsonSchema;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
}

export async function chat({
  messages,
  temperature = 0.7,
  maxTokens = 8192,
  jsonMode = false,
  responseSchema,
}: ChatOptions): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante dans les variables d'environnement");
  }

  const systemMessage = messages.find((m) => m.role === "system");
  const dialog = messages.filter((m) => m.role !== "system");

  const useJson = jsonMode || !!responseSchema;

  const body = {
    contents: dialog.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    ...(systemMessage
      ? { systemInstruction: { parts: [{ text: systemMessage.content }] } }
      : {}),
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(useJson ? { responseMimeType: "application/json" } : {}),
      ...(responseSchema ? { responseSchema } : {}),
    },
  };

  const res = await fetch(`${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text;
  const finishReason = candidate?.finishReason;

  if (!content) {
    throw new Error(`Réponse Gemini vide (finishReason=${finishReason ?? "inconnu"})`);
  }
  if (finishReason && finishReason !== "STOP") {
    throw new Error(
      `Génération interrompue (${finishReason}) — augmente maxTokens ou raccourcis le prompt`,
    );
  }
  return content;
}
