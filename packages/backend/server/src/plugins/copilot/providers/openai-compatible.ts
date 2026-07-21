import { OpenAIProvider } from './openai';
import {
  checkProviderParams,
  type ResolvedProviderModel,
} from './provider-model-runtime';
import type {
  CopilotProviderExecution,
  ProviderDriverSpec,
} from './provider-runtime-contract';
import {
  type CopilotChatOptions,
  type CopilotImageOptions,
  type CopilotProviderModel,
  CopilotProviderType,
  type CopilotStructuredOptions,
  type ModelFullConditions,
  ModelInputType,
  ModelOutputType,
  type PromptMessage,
} from './types';

export type OpenAICompatibleConfig = {
  apiKey: string;
  baseURL: string;
  /** Fallback model sent to the relay when the requested id is not in the dynamic list. */
  defaultModel: string;
  /** Advertise reasoning support so the Extended Thinking toggle is honored. */
  reasoningSupported?: boolean;
};

type ModelListCacheEntry = {
  fetchedAt: number;
  ids: Set<string>;
  inflight?: Promise<void>;
};

const MODEL_LIST_TTL = 5 * 60 * 1000;
const TAKEOVER_OUTPUT_TYPES = new Set<ModelOutputType>([
  ModelOutputType.Text,
  ModelOutputType.Object,
  ModelOutputType.Structured,
]);

/**
 * Unified OpenAI-compatible relay provider.
 *
 * Unlike the family providers, model routing is NOT gated by the static model
 * catalog compiled into the native module: any requested model id is accepted
 * and forwarded to the relay verbatim (or substituted with `defaultModel` when
 * it is not present in the dynamically fetched `{baseURL}/v1/models` list).
 */
export class OpenAICompatibleProvider extends OpenAIProvider {
  override readonly type = CopilotProviderType.OpenAICompatible;

  readonly #modelListCache = new Map<string, ModelListCacheEntry>();

  private compatConfig(
    execution?: CopilotProviderExecution
  ): OpenAICompatibleConfig {
    return this.getConfig(execution) as unknown as OpenAICompatibleConfig;
  }

  protected override resolveModelBackendKind() {
    return 'openai_chat' as const;
  }

  override configured(execution?: CopilotProviderExecution): boolean {
    const config = this.compatConfig(execution);
    return !!config.apiKey && !!config.baseURL && !!config.defaultModel;
  }

  override async match(
    cond: ModelFullConditions = {},
    execution?: CopilotProviderExecution
  ): Promise<boolean> {
    if (!this.configured(execution)) {
      return false;
    }
    if (cond.outputType && !TAKEOVER_OUTPUT_TYPES.has(cond.outputType)) {
      return false;
    }
    // warm the dynamic model list so the sync selectModel path can consult it
    this.refreshModelList(execution).catch(() => {});
    return true;
  }

  override selectModel(
    cond: ModelFullConditions,
    execution?: CopilotProviderExecution
  ): CopilotProviderModel {
    return this.buildModel(
      this.pickModelId(cond.modelId, execution),
      execution
    );
  }

  override resolveModel(
    modelId: string,
    execution?: CopilotProviderExecution
  ): ResolvedProviderModel | undefined {
    return this.buildModel(this.pickModelId(modelId, execution), execution);
  }

  override checkParams(input: {
    cond: ModelFullConditions;
    messages?: PromptMessage[];
    embeddings?: string[];
    options?:
      | CopilotChatOptions
      | CopilotStructuredOptions
      | CopilotImageOptions;
    withAttachment?: boolean;
    execution?: CopilotProviderExecution;
  }) {
    return checkProviderParams(
      this.resolveModelRuntimeContext(input.execution),
      {
        ...input,
        resolveModel: cond => this.selectModel(cond, input.execution),
      }
    );
  }

  async listModels(execution?: CopilotProviderExecution): Promise<string[]> {
    await this.refreshModelList(execution);
    return Array.from(this.cachedModelIds(execution) ?? []);
  }

  private pickModelId(
    requested: string | undefined,
    execution?: CopilotProviderExecution
  ): string {
    const config = this.compatConfig(execution);
    if (requested) {
      const listed = this.cachedModelIds(execution);
      if (listed?.has(requested)) {
        return requested;
      }
    }
    return config.defaultModel || requested || '';
  }

  private buildModel(
    modelId: string,
    execution?: CopilotProviderExecution
  ): ResolvedProviderModel {
    const config = this.compatConfig(execution);
    return {
      id: modelId,
      name: modelId,
      backendKind: this.resolveModelBackendKind(),
      canonicalKey: modelId,
      protocol: 'openai_chat',
      behaviorFlags: config.reasoningSupported ? ['reasoning_supported'] : [],
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [
            ModelOutputType.Text,
            ModelOutputType.Object,
            ModelOutputType.Structured,
          ],
          attachments: { kinds: ['image'], allowRemoteUrls: false },
          defaultForOutputType: true,
        },
      ],
    };
  }

  /**
   * The relay path builds requests through the native runtime, which rejects
   * remote attachment URLs (`allowRemoteUrls: false`) and does not materialize
   * them. The base provider only materializes attachments on the image-output
   * path, so a chat/action carrying an image (e.g. "extract image text") sends
   * AFFiNE's internal blob URL to the native builder and fails with
   * "Native path does not support remote attachment urls".
   *
   * Mirror the image path for chat and structured outputs: materialize remote
   * image attachments into inline base64 data URLs before the request is built,
   * so an external relay that cannot reach AFFiNE's internal blob URLs still
   * receives the image inline. Materialization is idempotent (data: URLs and
   * non-remote attachments pass through untouched).
   */
  override getDriverSpec(): ProviderDriverSpec {
    const base = super.getDriverSpec();
    return {
      ...base,
      ...(base.chat === false
        ? {}
        : {
            chat: {
              ...base.chat,
              prepareMessages: context =>
                this.prepareImageMessages(
                  context.input.messages,
                  context.options ?? {}
                ),
            },
          }),
      ...(base.structured === false
        ? {}
        : {
            structured: {
              ...base.structured,
              prepareMessages: (messages, _backendConfig, options) =>
                this.prepareImageMessages(messages, options ?? {}),
            },
          }),
    };
  }

  private cacheKey(execution?: CopilotProviderExecution) {
    return execution?.providerId ?? `${this.type}-default`;
  }

  private cachedModelIds(execution?: CopilotProviderExecution) {
    return this.#modelListCache.get(this.cacheKey(execution))?.ids;
  }

  private async refreshModelList(
    execution?: CopilotProviderExecution
  ): Promise<void> {
    const key = this.cacheKey(execution);
    const entry = this.#modelListCache.get(key);
    if (entry?.inflight) {
      return entry.inflight;
    }
    if (entry && Date.now() - entry.fetchedAt < MODEL_LIST_TTL) {
      return;
    }

    const config = this.compatConfig(execution);
    if (!config.apiKey || !config.baseURL) {
      return;
    }

    const inflight = this.fetchModelList(config)
      .then(ids => {
        this.#modelListCache.set(key, { fetchedAt: Date.now(), ids });
      })
      .catch(e => {
        this.logger.warn(
          `Failed to fetch model list from ${config.baseURL}: ${e?.message ?? e}`
        );
        // keep the previous list, but back off before retrying
        this.#modelListCache.set(key, {
          fetchedAt: Date.now(),
          ids: this.#modelListCache.get(key)?.ids ?? new Set(),
        });
      });

    this.#modelListCache.set(key, {
      fetchedAt: entry?.fetchedAt ?? 0,
      ids: entry?.ids ?? new Set(),
      inflight,
    });

    return inflight;
  }

  private async fetchModelList(
    config: OpenAICompatibleConfig
  ): Promise<Set<string>> {
    const base = config.baseURL.replace(/\/+$/, '').replace(/\/v1$/, '');
    const res = await globalThis.fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`GET /v1/models failed with HTTP ${res.status}`);
    }
    const body = (await res.json()) as { data?: Array<{ id?: string }> };
    return new Set(
      (body.data ?? [])
        .map(model => model.id)
        .filter((id): id is string => !!id)
    );
  }
}
