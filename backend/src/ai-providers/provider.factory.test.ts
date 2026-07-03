import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import { AiProviderFactory } from './provider.factory';

const KEY_VARS = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY'] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = Object.fromEntries(KEY_VARS.map((key) => [key, process.env[key]]));
  for (const key of KEY_VARS) delete process.env[key];
});

afterEach(() => {
  for (const key of KEY_VARS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

test('listProviders reports all three vendors as unconfigured with no keys set', () => {
  const factory = new AiProviderFactory();
  const providers = factory.listProviders();

  assert.equal(providers.length, 3);
  assert.deepEqual(
    providers.map((p) => p.id).sort(),
    ['anthropic', 'gemini', 'openai']
  );
  assert.ok(providers.every((p) => p.configured === false));
});

test('listProviders reports a provider as configured once its API key env var is set', () => {
  process.env.OPENAI_API_KEY = 'test-key';
  const factory = new AiProviderFactory();

  const openai = factory.listProviders().find((p) => p.id === 'openai');
  assert.equal(openai?.configured, true);

  const anthropic = factory.listProviders().find((p) => p.id === 'anthropic');
  assert.equal(anthropic?.configured, false);
});

test('getProvider returns the matching provider by name', () => {
  const factory = new AiProviderFactory();
  assert.equal(factory.getProvider('openai').name, 'openai');
  assert.equal(factory.getProvider('anthropic').name, 'anthropic');
  assert.equal(factory.getProvider('gemini').name, 'gemini');
});

test('each provider exposes a non-empty model list', () => {
  const factory = new AiProviderFactory();
  for (const provider of factory.listProviders()) {
    assert.ok(provider.models.length > 0, `${provider.id} should list at least one model`);
  }
});
