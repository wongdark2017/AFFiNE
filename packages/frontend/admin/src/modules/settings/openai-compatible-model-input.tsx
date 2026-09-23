import { Button } from '@affine/admin/components/ui/button';
import { Input } from '@affine/admin/components/ui/input';
import { Label } from '@affine/admin/components/ui/label';
import { affineFetch } from '@affine/admin/fetch-utils';
import { cn } from '@affine/admin/utils';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { t } from '../../i18n';
import { getCopilotProviderError } from './copilot-provider-error';

const FETCH_ERROR =
  'Unable to fetch models. Check the API key and endpoint, then try again.';
const INVALID_LIST_ERROR = 'Model service returned an invalid model list.';
const ADMIN_ERROR = 'Sign in as an administrator to get models.';
const RATE_LIMIT_ERROR = 'Too many requests. Wait a moment and try again.';

async function requestModels(
  apiKey: string,
  baseURL: string,
  signal: AbortSignal
): Promise<string[]> {
  const response = await affineFetch('/api/copilot/admin/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey, baseURL }),
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(ADMIN_ERROR);
  }
  if (response.status === 429) {
    throw new Error(RATE_LIMIT_ERROR);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(response.ok ? INVALID_LIST_ERROR : FETCH_ERROR);
  }

  if (!response.ok) {
    throw new Error(getCopilotProviderError(payload, FETCH_ERROR));
  }

  const models =
    payload && typeof payload === 'object' && 'models' in payload
      ? payload.models
      : undefined;
  if (
    !Array.isArray(models) ||
    !models.every(model => typeof model === 'string' && model.trim())
  ) {
    throw new Error(INVALID_LIST_ERROR);
  }

  return [...new Set<string>(models)];
}

type ModelsState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; models: string[] }
  | { status: 'error'; message: string };

export function OpenAICompatibleModelInput({
  apiKey,
  baseURL,
  value,
  onChange,
}: {
  apiKey: string;
  baseURL: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const credentialsRef = useRef({ apiKey, baseURL });
  credentialsRef.current = { apiKey, baseURL };
  const [state, setState] = useState<ModelsState>({ status: 'idle' });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const canFetch = Boolean(apiKey.trim() && baseURL.trim());
  const loading = state.status === 'loading';
  const models = state.status === 'ready' ? state.models : undefined;
  const filteredModels = useMemo(() => {
    const search = query.trim().toLowerCase();
    return models?.filter(model => model.toLowerCase().includes(search)) ?? [];
  }, [models, query]);
  const expanded = open && Boolean(models?.length);
  const activeModel = filteredModels[activeIndex];

  useEffect(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setState({ status: 'idle' });
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);

    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [apiKey, baseURL]);

  useEffect(() => {
    if (expanded && activeIndex >= 0) {
      const option = listRef.current?.children[activeIndex];
      option?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [activeIndex, expanded, filteredModels]);

  const fetchModels = async () => {
    if (!canFetch || loading) {
      return;
    }
    requestRef.current?.abort();
    const request = new AbortController();
    requestRef.current = request;
    setState({ status: 'loading' });
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);

    const isCurrentRequest = () =>
      !request.signal.aborted &&
      requestRef.current === request &&
      credentialsRef.current.apiKey === apiKey &&
      credentialsRef.current.baseURL === baseURL;

    try {
      const models = await requestModels(apiKey, baseURL, request.signal);
      if (isCurrentRequest()) {
        setState({ status: 'ready', models });
        setOpen(models.length > 0);
      }
    } catch (error) {
      if (isCurrentRequest()) {
        setState({
          status: 'error',
          message: getCopilotProviderError(error, FETCH_ERROR),
        });
      }
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null;
      }
    }
  };

  const selectModel = (model: string) => {
    onChange(model);
    setQuery('');
    setActiveIndex(-1);
    inputRef.current?.focus();
    setOpen(false);
  };

  const buttonLabel = loading
    ? 'Fetching models...'
    : state.status === 'error'
      ? 'Retry'
      : state.status === 'ready'
        ? 'Refresh models'
        : 'Get models';

  return (
    <div
      className="flex min-w-0 flex-col gap-2 sm:col-span-2"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <Label htmlFor={id} className="text-sm font-medium leading-5">
        {t('Default model')}
      </Label>
      <div className="flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={expanded ? `${id}-models` : undefined}
            aria-activedescendant={
              expanded && activeModel ? `${id}-model-${activeIndex}` : undefined
            }
            aria-describedby={`${id}-help ${id}-status`}
            autoComplete="off"
            spellCheck={false}
            value={value}
            placeholder={t('Enter the model ID from your provider')}
            className={models?.length ? 'pr-11' : undefined}
            onChange={event => {
              const next = event.target.value;
              onChange(next);
              setQuery(next);
              setActiveIndex(0);
              setOpen(Boolean(models?.length));
            }}
            onFocus={() => setOpen(Boolean(models?.length))}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                setOpen(false);
                return;
              }
              if (
                (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
                filteredModels.length > 0
              ) {
                event.preventDefault();
                setOpen(true);
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                setActiveIndex(current =>
                  !expanded || current < 0
                    ? direction > 0
                      ? 0
                      : filteredModels.length - 1
                    : (current + direction + filteredModels.length) %
                      filteredModels.length
                );
              } else if (event.key === 'Enter' && expanded && activeModel) {
                event.preventDefault();
                selectModel(activeModel);
              }
            }}
          />
          {models?.length ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
              aria-label={t('Show model options')}
              aria-expanded={expanded}
              aria-controls={expanded ? `${id}-models` : undefined}
              onMouseDown={event => event.preventDefault()}
              onClick={() => {
                inputRef.current?.focus();
                setQuery('');
                setActiveIndex(-1);
                setOpen(!expanded);
              }}
            >
              <ChevronsUpDown size={16} aria-hidden="true" />
            </Button>
          ) : null}
          {expanded ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-md">
              <div
                ref={listRef}
                id={`${id}-models`}
                role="listbox"
                aria-label={t('Available models')}
              >
                {filteredModels.map((model, index) => (
                  <button
                    key={model}
                    id={`${id}-model-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    tabIndex={-1}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent',
                      index === activeIndex &&
                        'bg-accent text-accent-foreground'
                    )}
                    onMouseDown={event => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectModel(model)}
                  >
                    <span className="min-w-0 break-all">{model}</span>
                    {value === model ? (
                      <Check
                        size={16}
                        className="shrink-0"
                        aria-hidden="true"
                      />
                    ) : null}
                  </button>
                ))}
              </div>
              {filteredModels.length === 0 ? (
                <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
                  {t('No matching models. You can enter a model ID manually.')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          disabled={!canFetch || loading}
          onClick={() => {
            fetchModels().catch(() => {
              setState({ status: 'error', message: FETCH_ERROR });
            });
          }}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : null}
          {t(buttonLabel)}
        </Button>
      </div>
      <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">
        {canFetch
          ? t('Select a fetched model or enter any supported model ID.')
          : t(
              'Fill in an API key and endpoint to get models, or enter a model ID manually.'
            )}
      </p>
      <div
        id={`${id}-status`}
        role={state.status === 'error' ? 'alert' : 'status'}
        className={cn(
          'text-xs leading-5',
          state.status === 'error'
            ? 'text-destructive'
            : 'text-muted-foreground'
        )}
      >
        {state.status === 'error'
          ? t(state.message)
          : state.status === 'ready'
            ? state.models.length > 0
              ? t('{count} models available.', { count: state.models.length })
              : t('No models were returned. You can enter a model ID manually.')
            : loading
              ? t('Fetching models...')
              : null}
      </div>
    </div>
  );
}
