import test from 'ava';

import { OpenAICompatibleProvider } from '../../plugins/copilot/providers/openai-compatible';
import type { PromptMessage } from '../../plugins/copilot/providers/types';
import { promptAttachmentToUrl } from '../../plugins/copilot/providers/utils';

const REMOTE_BLOB_URL =
  'http://affine.internal/api/workspaces/w1/blobs/screenshot-id';

function makeProvider() {
  const provider = new OpenAICompatibleProvider();
  const requested: string[] = [];
  // Fake the remote-attachment fetcher so materialization does not hit the
  // network. Mirrors installRemoteAttachmentMaterializer in native-provider.spec.
  (provider as any).attachmentMaterializer = {
    fetchRemoteAttachment: async (url: string) => {
      requested.push(url);
      return {
        data: Buffer.from('png-bytes', 'utf8').toString('base64'),
        mimeType: 'image/png',
      };
    },
  };
  return { provider, requested };
}

function userMessage(attachment: unknown): PromptMessage {
  return {
    role: 'user',
    content: 'extract image text',
    attachments: [attachment],
  } as unknown as PromptMessage;
}

test('getDriverSpec adds prepareMessages to chat and structured', t => {
  const { provider } = makeProvider();
  const spec = provider.getDriverSpec();
  t.true(spec.chat !== false && typeof spec.chat?.prepareMessages === 'function');
  t.true(
    spec.structured !== false &&
      typeof spec.structured?.prepareMessages === 'function'
  );
});

test('chat prepareMessages materializes a remote image attachment to a data URL', async t => {
  const { provider, requested } = makeProvider();
  const spec = provider.getDriverSpec();
  if (spec.chat === false || !spec.chat?.prepareMessages) {
    return t.fail('chat.prepareMessages missing');
  }

  const messages = [userMessage(REMOTE_BLOB_URL)];
  const prepared = await spec.chat.prepareMessages({
    input: { messages },
    options: {},
  } as any);

  t.deepEqual(requested, [REMOTE_BLOB_URL]);
  const url = promptAttachmentToUrl(prepared[0].attachments![0]) ?? '';
  t.true(url.startsWith('data:image/png;base64,'), url.slice(0, 32));
});

test('structured prepareMessages materializes a remote image attachment', async t => {
  const { provider, requested } = makeProvider();
  const spec = provider.getDriverSpec();
  if (spec.structured === false || !spec.structured?.prepareMessages) {
    return t.fail('structured.prepareMessages missing');
  }

  const messages = [userMessage(REMOTE_BLOB_URL)];
  const prepared = await spec.structured.prepareMessages(
    messages,
    {} as any,
    {} as any
  );

  t.deepEqual(requested, [REMOTE_BLOB_URL]);
  const url = promptAttachmentToUrl(prepared[0].attachments![0]) ?? '';
  t.true(url.startsWith('data:image/png;base64,'));
});

test('already-inlined data: attachments pass through untouched', async t => {
  const { provider, requested } = makeProvider();
  const spec = provider.getDriverSpec();
  if (spec.chat === false || !spec.chat?.prepareMessages) {
    return t.fail('chat.prepareMessages missing');
  }

  const dataUrl = 'data:image/png;base64,YWJj';
  const prepared = await spec.chat.prepareMessages({
    input: { messages: [userMessage(dataUrl)] },
    options: {},
  } as any);

  t.deepEqual(requested, [], 'no remote fetch for data: URLs');
  t.is(promptAttachmentToUrl(prepared[0].attachments![0]), dataUrl);
});
