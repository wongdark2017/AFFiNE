import { Injectable } from '@nestjs/common';

import { CopilotSessionInvalidInput } from '../../../base';
import { llmResolveRequestedModelMatch } from '../../../native';
import { CopilotProviderRegistryService } from '../providers/registry-service';
import { CopilotProviderType } from '../providers/types';

export type ResolveModelInput = {
  defaultModel: string;
  optionalModels?: string[] | null;
  requestedModelId?: string;
};

@Injectable()
export class ModelSelectionPolicy {
  constructor(private readonly registries: CopilotProviderRegistryService) {}

  private getRegistry() {
    return this.registries.getRegistry();
  }

  private matchRequestedModel(
    optionalModels: string[],
    requestedModelId?: string,
    defaultModel?: string
  ) {
    return llmResolveRequestedModelMatch({
      providerIds: [...this.getRegistry().profiles.keys()],
      optionalModels,
      requestedModelId,
      defaultModel,
    });
  }

  // when the unified relay takes over routing, any requested model id is
  // valid — do not fall back to the prompt default on catalog mismatch
  private hasTakeoverProvider() {
    for (const profile of this.getRegistry().profiles.values()) {
      if (profile.type !== CopilotProviderType.OpenAICompatible) {
        continue;
      }
      const config = profile.config as {
        apiKey?: string;
        baseURL?: string;
        defaultModel?: string;
      };
      if (config.apiKey && config.baseURL && config.defaultModel) {
        return true;
      }
    }
    return false;
  }

  resolveRequestedModel(input: ResolveModelInput): {
    selectedModel: string;
    matchedOptionalModel: boolean;
  } {
    if (!input.defaultModel) {
      throw new CopilotSessionInvalidInput('Model is required');
    }
    if (input.requestedModelId && this.hasTakeoverProvider()) {
      return {
        selectedModel: input.requestedModelId,
        matchedOptionalModel: true,
      };
    }
    const matched = this.matchRequestedModel(
      input.optionalModels ?? [],
      input.requestedModelId,
      input.defaultModel
    );
    return {
      selectedModel: matched.selectedModel ?? input.defaultModel,
      matchedOptionalModel: matched.matchedOptionalModel,
    };
  }

  matchesModelList(models: string[], modelId?: string) {
    return this.matchRequestedModel(models, modelId).matchedOptionalModel;
  }
}
