// flash-lite : ~2× plus rapide que flash et bien moins sujet aux 503 "high demand".
export const GEMINI_MODEL = "gemini-2.5-flash-lite";
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
  /** Budget de réflexion Gemini. 0 = désactivé (recommandé pour sortie JSON). */
  thinkingBudget?: number;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
}

// Gemini renvoie des 503 "UNAVAILABLE" par intermittence (surcharge), parfois
// après une longue attente. On borne chaque tentative et on réessaie : sans ça,
// l'appel peut traîner ~50s et faire échouer la fonction serverless (504).
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { attempts = 3, perTryTimeoutMs = 15_000 } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perTryTimeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (RETRYABLE_STATUS.has(res.status) && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
        continue;
      }
    }
  }
  throw new Error(
    `Gemini injoignable après ${attempts} tentatives : ${lastErr instanceof Error ? lastErr.message : "timeout"}`,
  );
}

export async function chat({
  messages,
  temperature = 0.7,
  maxTokens = 32768,
  jsonMode = false,
  responseSchema,
  thinkingBudget = 0,
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
      thinkingConfig: { thinkingBudget },
      ...(useJson ? { responseMimeType: "application/json" } : {}),
      ...(responseSchema ? { responseSchema } : {}),
    },
  };

  const res = await fetchWithRetry(`${GEMINI_ENDPOINT(GEMINI_MODEL)}?key=${apiKey}`, {
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
