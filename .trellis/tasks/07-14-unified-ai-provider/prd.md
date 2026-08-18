# PRD: Unified AI Provider (dynamic model list, single key/baseURL takeover)

## Background

Self-hosted AFFiNE routes copilot requests through per-family providers (openai / gemini / anthropic / …). Which models exist is decided by a **static model catalog compiled into the Rust native module** (`llm_adapter` crate). Consequences on the test deployment (103.217.203.235:3010):

- Chat default model `gemini-2.5-flash` fails with `NO_COPILOT_PROVIDER_AVAILABLE` unless a Gemini API key is configured.
- The chat "Model" picker is empty ("No Results") because none of the prompt's `optionalModels` resolve to a configured provider.
- The user runs an OpenAI-compatible relay (`https://hk.getelucid.com`) that serves many model families behind one endpoint/key, but there is no way to route arbitrary model ids through it: the static catalog rejects unknown ids, and each family requires its own key config.

## Requirement (user's words)

- 所有 AI 聊天都通过 **一个 API key + 一个 baseURL** 接管。
- 模型列表 **动态拉取**（configure key+URL → fetch models from the endpoint），不要依赖内置静态表。
- 不能三家配三个 key。

## Goals

1. New provider type `openaiCompatible`, configurable in Admin panel (`/admin/settings` → AI): `apiKey`, `baseURL`, `defaultModel` (+ optional `reasoningSupported`).
2. When configured, it takes **top routing priority** and accepts **any requested model id** for text/object/structured outputs — no static-catalog gate.
3. Model list is **dynamically fetched** from `{baseURL}/v1/models` (OpenAI convention) and shown in the chat model picker.
4. A model id not present in the dynamic list resolves to `defaultModel` (so the 17+ prompts hard-coded to `gemini-2.5-flash` in built-in.json transparently work through the proxy).
5. A model the user picks from the dynamic list is honored end-to-end (session model-selection policy must not silently fall back to the prompt default).
6. Zero behavior change when the unified provider is not configured — existing per-family providers work exactly as today.

## Non-goals

- Embedding / rerank / image-generation routing through the unified provider (chat text/object/structured only; embedding stays on existing providers).
- Removing the native static catalog for the existing per-family providers.
- BYOK integration.

## Acceptance criteria

- [x] With ONLY `providers.openaiCompatible` configured (no gemini/openai/anthropic keys):
  - [x] Chat panel Model picker lists the models returned by `{baseURL}/v1/models`.
  - [x] Sending a chat message succeeds; the proxy receives the expected model (`defaultModel` when the requested id is unknown, the picked id when chosen from the list).
  - [x] Other AI actions (translate/summarize) work — their hard-coded `gemini-2.5-flash` resolves through the proxy as `defaultModel`.
- [x] With the unified provider NOT configured, provider resolution behaves identically to current dev-main (regression-safe).
- [x] `yarn workspace @affine/server build` and `yarn affine @affine/admin build` pass; deployed to the remote test env and verified live.
