import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AnthropicProvider } from './anthropic.provider';
import { GeminiProvider } from './gemini.provider';
import { OpenAiProvider } from './openai.provider';
import { ProviderNotConfiguredError } from './ai-provider.interface';

async function drain(iterable: AsyncIterable<string>): Promise<string> {
  let out = '';
  for await (const chunk of iterable) out += chunk;
  return out;
}

test('OpenAiProvider.isConfigured is false without an API key, true with one', () => {
  assert.equal(new OpenAiProvider(undefined).isConfigured(), false);
  assert.equal(new OpenAiProvider('sk-test').isConfigured(), true);
});

test('AnthropicProvider.isConfigured is false without an API key, true with one', () => {
  assert.equal(new AnthropicProvider(undefined).isConfigured(), false);
  assert.equal(new AnthropicProvider('sk-test').isConfigured(), true);
});

test('GeminiProvider.isConfigured is false without an API key, true with one', () => {
  assert.equal(new GeminiProvider(undefined).isConfigured(), false);
  assert.equal(new GeminiProvider('test-key').isConfigured(), true);
});

test('unconfigured providers throw ProviderNotConfiguredError instead of hitting the network', async () => {
  const options = { model: 'x', temperature: 0.5, maxTokens: 100, signal: new AbortController().signal };

  for (const provider of [new OpenAiProvider(undefined), new AnthropicProvider(undefined), new GeminiProvider(undefined)]) {
    await assert.rejects(
      () => drain(provider.streamCompletion([{ role: 'user', content: 'hi' }], options)),
      ProviderNotConfiguredError
    );
  }
});
