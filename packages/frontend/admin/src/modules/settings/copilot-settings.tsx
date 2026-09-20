import { Button } from '@affine/admin/components/ui/button';
import { Input } from '@affine/admin/components/ui/input';
import { Label } from '@affine/admin/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@affine/admin/components/ui/select';
import { Switch } from '@affine/admin/components/ui/switch';
import { get } from 'lodash-es';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';

import { t } from '../../i18n';
import type { AppConfig } from './config';
import { OpenAICompatibleConnectionTest } from './openai-compatible-connection-test';
import { OpenAICompatibleModelInput } from './openai-compatible-model-input';

type FieldValue = string | number | boolean | undefined;
type OnChange = (field: string, value: FieldValue) => void;
type FieldDefinition = {
  key: string;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: FieldValue;
  emptyAsUndefined?: boolean;
  type?: 'text' | 'password' | 'number' | 'boolean';
  options?: { value: string; label: string; resetToDefault?: boolean }[];
};

const API_KEY: FieldDefinition = {
  key: 'apiKey',
  label: 'API key',
  type: 'password',
  placeholder: 'Enter API key',
};
const API_ENDPOINT: FieldDefinition = {
  key: 'baseURL',
  label: 'API endpoint',
  placeholder: 'https://api.example.com/v1',
};

const PROVIDERS: {
  key: string;
  title: string;
  description: string;
  fields: FieldDefinition[];
}[] = [
  {
    key: 'providers.openaiCompatible',
    title: 'OpenAI-compatible API',
    description:
      'Enter an API key, endpoint and default model to route all chats through this service. Clear the API key to stop using it.',
    fields: [
      API_KEY,
      {
        ...API_ENDPOINT,
        description:
          'Use the API base URL, with or without /v1. Do not include /chat/completions.',
      },
      {
        key: 'defaultModel',
        label: 'Default model',
        placeholder: 'Enter the model ID from your provider',
        description: 'Use a model ID supported by this service.',
      },
      {
        key: 'reasoningSupported',
        label: 'Supports reasoning',
        type: 'boolean',
        description:
          'Enable only if the service supports reasoning parameters.',
      },
    ],
  },
  {
    key: 'providers.openai',
    title: 'OpenAI',
    description:
      'Configure OpenAI access. Leave the API key empty to disable this provider.',
    fields: [
      API_KEY,
      { ...API_ENDPOINT, placeholder: 'https://api.openai.com/v1' },
      {
        key: 'oldApiStyle',
        label: 'Use legacy API',
        type: 'boolean',
        description:
          'Use Chat Completions for services that do not support the Responses API.',
      },
    ],
  },
  {
    key: 'providers.gemini',
    title: 'Gemini',
    description:
      'Configure Gemini access. Leave the API key empty to disable this provider.',
    fields: [
      API_KEY,
      {
        ...API_ENDPOINT,
        placeholder: 'https://generativelanguage.googleapis.com/v1beta',
      },
    ],
  },
  {
    key: 'providers.anthropic',
    title: 'Anthropic',
    description:
      'Configure Claude access. Leave the API key empty to disable this provider.',
    fields: [
      API_KEY,
      { ...API_ENDPOINT, placeholder: 'https://api.anthropic.com/v1' },
    ],
  },
  {
    key: 'providers.fal',
    title: 'FAL',
    description: 'Configure image generation with FAL.',
    fields: [API_KEY],
  },
  {
    key: 'unsplash',
    title: 'Unsplash',
    description: 'Allow AI to search for images on Unsplash.',
    fields: [{ ...API_KEY, key: 'key' }],
  },
  {
    key: 'exa',
    title: 'Exa',
    description: 'Allow AI to search the web with Exa.',
    fields: [{ ...API_KEY, key: 'key' }],
  },
];

const STORAGE_FIELDS: FieldDefinition[] = [
  {
    key: 'provider',
    label: 'Storage provider',
    options: [
      { value: 'fs', label: 'Local filesystem' },
      { value: 'aws-s3', label: 'S3-compatible storage' },
      { value: 'cloudflare-r2', label: 'Cloudflare R2' },
      { value: 'assetpack', label: 'Asset pack' },
    ],
  },
  { key: 'bucket', label: 'Bucket name' },
];

const S3_FIELDS: FieldDefinition[] = [
  { key: 'config.credentials.accessKeyId', label: 'Access key ID' },
  {
    key: 'config.credentials.secretAccessKey',
    label: 'Secret access key',
    type: 'password',
  },
  {
    key: 'config.credentials.sessionToken',
    label: 'Session token (optional)',
    type: 'password',
  },
  {
    key: 'config.requestTimeoutMs',
    label: 'Request timeout (ms)',
    type: 'number',
    placeholder: 'Default: 30000',
  },
  {
    key: 'config.minPartSize',
    label: 'Multipart upload part size (bytes)',
    type: 'number',
  },
  {
    key: 'config.presign.expiresInSeconds',
    label: 'Presigned URL expiry (seconds)',
    type: 'number',
    placeholder: 'Default: 60',
  },
  {
    key: 'config.presign.signContentTypeForPut',
    label: 'Sign upload content type',
    type: 'boolean',
    defaultValue: true,
  },
];

const R2_FIELDS: FieldDefinition[] = [
  { key: 'config.accountId', label: 'Cloudflare account ID' },
  {
    key: 'config.jurisdiction',
    label: 'Jurisdiction',
    defaultValue: 'default',
    options: [
      { value: 'default', label: 'Default', resetToDefault: true },
      { value: 'eu', label: 'European Union' },
    ],
  },
  {
    key: 'config.usePresignedURL.enabled',
    label: 'Use presigned URLs',
    type: 'boolean',
  },
  {
    key: 'config.usePresignedURL.urlPrefix',
    label: 'Custom storage domain',
    placeholder: 'https://storage.example.com',
  },
  {
    key: 'config.usePresignedURL.signKey',
    label: 'URL signing key',
    type: 'password',
  },
];

function SettingField({
  definition,
  field,
  value: configuredValue,
  onChange,
}: {
  definition: FieldDefinition;
  field: string;
  value: unknown;
  onChange: OnChange;
}) {
  const id = useId();
  const [showSecret, setShowSecret] = useState(false);
  const {
    label,
    description,
    type = 'text',
    placeholder,
    options,
  } = definition;
  const value = configuredValue ?? definition.defaultValue;
  const descriptionId = description ? `${id}-description` : undefined;
  const secret = type === 'password';

  const fieldLabel = (
    <Label htmlFor={id} className="text-sm font-medium leading-5">
      {t(label)}
    </Label>
  );
  const fieldDescription = description ? (
    <p id={descriptionId} className="text-xs leading-5 text-muted-foreground">
      {t(description)}
    </p>
  ) : null;

  const onInputChange = (next: string) => {
    if (type === 'number') {
      onChange(field, next === '' ? undefined : Number(next));
    } else {
      onChange(
        field,
        definition.emptyAsUndefined && next === '' ? undefined : next
      );
    }
  };

  const inputValue =
    typeof value === 'string' || typeof value === 'number' ? value : '';

  const secretToggleLabel = t(showSecret ? 'Hide {name}' : 'Show {name}', {
    name: t(label),
  });

  const secretToggleIcon = showSecret ? (
    <EyeOff size={16} aria-hidden="true" />
  ) : (
    <Eye size={16} aria-hidden="true" />
  );

  if (type === 'boolean') {
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-3 sm:col-span-2">
        <div className="flex min-w-0 flex-col gap-1">
          {fieldLabel}
          {fieldDescription}
        </div>
        <Switch
          id={id}
          aria-describedby={descriptionId}
          checked={Boolean(value)}
          onCheckedChange={checked => onChange(field, checked)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {fieldLabel}
      {options ? (
        <Select
          value={typeof value === 'string' ? value : ''}
          onValueChange={next => {
            const option = options.find(option => option.value === next);
            onChange(field, option?.resetToDefault ? undefined : next);
          }}
        >
          <SelectTrigger id={id} aria-describedby={descriptionId}>
            <SelectValue placeholder={t('Select an option')} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="relative">
          <Input
            id={id}
            aria-describedby={descriptionId}
            type={secret && showSecret ? 'text' : type}
            value={inputValue}
            placeholder={placeholder ? t(placeholder) : undefined}
            autoComplete="off"
            spellCheck={false}
            className={secret ? 'pr-11' : undefined}
            onChange={event => onInputChange(event.target.value)}
          />
          {secret ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
              aria-label={secretToggleLabel}
              title={secretToggleLabel}
              aria-pressed={showSecret}
              onClick={() => setShowSecret(current => !current)}
            >
              {secretToggleIcon}
            </Button>
          ) : null}
        </div>
      )}
      {fieldDescription}
    </div>
  );
}

function StorageSettings({
  config,
  onChange,
}: {
  config: AppConfig[string];
  onChange: OnChange;
}) {
  const provider = get(config, 'storage.provider');
  const fields = [...STORAGE_FIELDS];

  if (provider === 'fs' || provider === 'assetpack') {
    fields.push({ key: 'config.path', label: 'Storage directory' });
  } else if (provider === 'aws-s3' || provider === 'cloudflare-r2') {
    if (provider === 'aws-s3') {
      fields.push({
        key: 'config.endpoint',
        label: 'Storage endpoint (optional)',
        placeholder: 'https://s3.example.com',
        emptyAsUndefined: true,
      });
      fields.push({
        key: 'config.forcePathStyle',
        label: 'Use path-style addressing',
        type: 'boolean',
      });
    }
    fields.push({
      key: 'config.region',
      label: 'Region',
      placeholder: 'us-east-1',
      defaultValue: provider === 'cloudflare-r2' ? 'auto' : undefined,
      emptyAsUndefined: provider === 'cloudflare-r2',
    });
    fields.push(...S3_FIELDS);
    if (provider === 'cloudflare-r2') {
      fields.push(...R2_FIELDS);
    }
  }

  return (
    <details className="group rounded-xl border border-border/60 bg-background">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
        {t('AI file storage (advanced)')}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <p className="text-xs leading-5 text-muted-foreground">
          {t(
            'Choose where AI attachments are stored. Keep the defaults unless you need external storage.'
          )}
        </p>
        <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          {fields.map(definition => (
            <SettingField
              key={definition.key}
              definition={definition}
              field={`copilot/storage/${definition.key}`}
              value={get(config, `storage.${definition.key}`)}
              onChange={onChange}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

export function CopilotSettings({
  config,
  onChange,
}: {
  config: AppConfig[string];
  onChange: OnChange;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-5">
      <SettingField
        definition={{
          key: 'enabled',
          label: 'Enable AI',
          type: 'boolean',
          description: 'Allow AI chat and writing assistance on this server.',
        }}
        field="copilot/enabled"
        value={config.enabled}
        onChange={onChange}
      />
      {PROVIDERS.map(provider => (
        <div
          key={provider.key}
          role="group"
          aria-labelledby={`${id}-${provider.key}`}
          className="min-w-0 rounded-xl border border-border/60 bg-background p-4"
        >
          <h3 id={`${id}-${provider.key}`} className="text-sm font-semibold">
            {t(provider.title)}
          </h3>
          <p className="mb-4 mt-2 text-xs leading-5 text-muted-foreground">
            {t(provider.description)}
          </p>
          <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            {provider.fields.map(definition =>
              provider.key === 'providers.openaiCompatible' &&
              definition.key === 'defaultModel' ? (
                <OpenAICompatibleModelInput
                  key={definition.key}
                  apiKey={get(config, `${provider.key}.apiKey`) ?? ''}
                  baseURL={get(config, `${provider.key}.baseURL`) ?? ''}
                  value={get(config, `${provider.key}.defaultModel`) ?? ''}
                  onChange={value =>
                    onChange(`copilot/${provider.key}/defaultModel`, value)
                  }
                />
              ) : (
                <SettingField
                  key={definition.key}
                  definition={definition}
                  field={`copilot/${provider.key}/${definition.key}`}
                  value={get(config, `${provider.key}.${definition.key}`)}
                  onChange={onChange}
                />
              )
            )}
          </div>
          {provider.key === 'providers.openaiCompatible' ? (
            <OpenAICompatibleConnectionTest
              apiKey={get(config, `${provider.key}.apiKey`) ?? ''}
              baseURL={get(config, `${provider.key}.baseURL`) ?? ''}
              defaultModel={get(config, `${provider.key}.defaultModel`) ?? ''}
            />
          ) : null}
        </div>
      ))}
      <StorageSettings config={config} onChange={onChange} />
    </div>
  );
}
