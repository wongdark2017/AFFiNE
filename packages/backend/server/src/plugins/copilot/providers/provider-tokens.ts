import {
  AnthropicOfficialProvider,
  AnthropicVertexProvider,
} from './anthropic';
import { CloudflareWorkersAIProvider } from './cloudflare';
import { FalProvider } from './fal';
import { GeminiGenerativeProvider, GeminiVertexProvider } from './gemini';
import { OpenAIProvider } from './openai';
import { OpenAICompatibleProvider } from './openai-compatible';

export const CopilotProviders = [
  OpenAIProvider,
  OpenAICompatibleProvider,
  CloudflareWorkersAIProvider,
  FalProvider,
  GeminiGenerativeProvider,
  GeminiVertexProvider,
  AnthropicOfficialProvider,
  AnthropicVertexProvider,
];
