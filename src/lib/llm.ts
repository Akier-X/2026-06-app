import * as FileSystem from 'expo-file-system/legacy';
import type { TokenData } from 'llama.rn';

export const LLM_MODEL_SIZE_MB = 770;
const MODEL_DIR = `${FileSystem.documentDirectory}llm-models/`;
const MODEL_FILENAME = 'Llama-3.2-1B-Instruct-Q4_K_M.gguf';
export const MODEL_PATH = `${MODEL_DIR}${MODEL_FILENAME}`;
const MODEL_URL =
  'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf';

// llama.rn はネイティブモジュールなので Expo Go では動作しない。try で囲んで失敗時は null。
type LlamaRN = typeof import('llama.rn');
let llamaRN: LlamaRN | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  llamaRN = require('llama.rn') as LlamaRN;
} catch {
  // Expo Go or unsupported environment — falls back to rule-based engine
}

type LlamaContext = Awaited<ReturnType<NonNullable<LlamaRN>['initLlama']>>;

let activeContext: LlamaContext | null = null;
let modelLoadPromise: Promise<boolean> | null = null;

// ─────────────────────────────────────────
// ファイル管理
// ─────────────────────────────────────────

export async function isModelDownloaded(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!info.exists) return false;
    // ファイルが最低100MB以上あれば完全DL済みと判定
    return 'size' in info && (info as { size: number }).size > 100_000_000;
  } catch {
    return false;
  }
}

/** @returns ダウンロード済みファイルのバイト数。なければ0 */
export async function getModelFileSize(): Promise<number> {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!info.exists) return 0;
    return 'size' in info ? (info as { size: number }).size : 0;
  } catch {
    return 0;
  }
}

export async function downloadModel(
  onProgress: (progress: number) => void,
  signal?: { cancelled: boolean },
): Promise<void> {
  await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });

  const dl = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_PATH,
    {},
    (p: FileSystem.DownloadProgressData) => {
      if (signal?.cancelled) return;
      if (p.totalBytesExpectedToWrite > 0) {
        onProgress(p.totalBytesWritten / p.totalBytesExpectedToWrite);
      }
    },
  );

  const result = await dl.downloadAsync();
  if (!result || result.status !== 200) {
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }).catch(() => {});
    throw new Error(`ダウンロード失敗 (HTTP ${result?.status ?? 'unknown'})`);
  }
}

export async function deleteModel(): Promise<void> {
  if (activeContext) {
    try { await activeContext.release(); } catch { /* ignore */ }
    activeContext = null;
    modelLoadPromise = null;
  }
  await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
}

// ─────────────────────────────────────────
// モデルロード
// ─────────────────────────────────────────

export function isNativeSupported(): boolean {
  return llamaRN !== null;
}

export function isLLMReady(): boolean {
  return activeContext !== null;
}

/**
 * モデルをメモリにロードする（重複呼び出し安全）
 * @returns true = ロード成功、false = ネイティブ非対応 or DL未完了
 */
export async function loadModel(): Promise<boolean> {
  if (!llamaRN) return false;
  if (activeContext) return true;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    if (!(await isModelDownloaded())) return false;
    activeContext = await llamaRN!.initLlama({
      model: MODEL_PATH,
      use_mlock: true,
      n_ctx: 2048,
      n_threads: 4,
      n_gpu_layers: 0,
    });
    return true;
  })().catch(() => {
    modelLoadPromise = null;
    return false;
  });

  return modelLoadPromise;
}

export async function releaseModel(): Promise<void> {
  if (activeContext) {
    try { await activeContext.release(); } catch { /* ignore */ }
    activeContext = null;
    modelLoadPromise = null;
  }
}

// ─────────────────────────────────────────
// 推論
// ─────────────────────────────────────────

function buildPrompt(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
): string {
  const fmt = (role: string, content: string) =>
    `<|start_header_id|>${role}<|end_header_id|>\n\n${content}<|eot_id|>`;

  let prompt = '<|begin_of_text|>' + fmt('system', systemPrompt);
  for (const m of history) prompt += fmt(m.role, m.content);
  prompt += fmt('user', userMessage);
  prompt += '<|start_header_id|>assistant<|end_header_id|>\n\n';
  return prompt;
}

/**
 * ストリーミング推論を実行する
 * @param onToken  各トークンが生成されるたびに呼ばれるコールバック
 * @returns 全生成テキスト
 */
export async function generateLLMReply(
  systemPrompt: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
  onToken: (token: string) => void,
): Promise<string> {
  if (!activeContext) throw new Error('LLM not loaded');

  const prompt = buildPrompt(systemPrompt, history, userMessage);

  const result = await activeContext.completion(
    {
      prompt,
      n_predict: 400,
      temperature: 0.75,
      top_p: 0.9,
      top_k: 40,
      penalty_repeat: 1.1,
      stop: ['<|end_of_text|>', '<|eot_id|>', '<|end_header_id|>'],
    },
    (data: TokenData) => {
      onToken(data.token);
    },
  );

  return result.text.trim();
}
