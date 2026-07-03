import assert from 'node:assert/strict';
import { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { createApp } from '../app';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

before(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://localhost:${port}/api`;
});

after(() => {
  server.close();
});

test('GET /providers lists all three vendors with their model catalogs', async () => {
  const res = await fetch(`${baseUrl}/providers`);
  assert.equal(res.status, 200);
  const providers = (await res.json()) as { id: string; models: unknown[] }[];
  assert.equal(providers.length, 3);
  assert.ok(providers.every((p) => Array.isArray(p.models) && p.models.length > 0));
});

test('POST /conversations creates a conversation, GET /conversations lists its summary', async () => {
  const createRes = await fetch(`${baseUrl}/conversations`, { method: 'POST' });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as { id: string; title: string };

  const listRes = await fetch(`${baseUrl}/conversations`);
  const summaries = (await listRes.json()) as { id: string }[];
  assert.ok(summaries.some((s) => s.id === created.id));
});

test('GET /conversations/:id returns 404 for an unknown id', async () => {
  const res = await fetch(`${baseUrl}/conversations/does-not-exist`);
  assert.equal(res.status, 404);
});

test('PATCH /conversations/:id renames the conversation and updates settings', async () => {
  const created = (await (await fetch(`${baseUrl}/conversations`, { method: 'POST' })).json()) as {
    id: string;
  };

  const patchRes = await fetch(`${baseUrl}/conversations/${created.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Renamed', settings: { temperature: 1.5 } }),
  });
  assert.equal(patchRes.status, 200);
  const updated = (await patchRes.json()) as { title: string; settings: { temperature: number } };
  assert.equal(updated.title, 'Renamed');
  assert.equal(updated.settings.temperature, 1.5);
});

test('DELETE /conversations/:id removes it; a second delete 404s', async () => {
  const created = (await (await fetch(`${baseUrl}/conversations`, { method: 'POST' })).json()) as {
    id: string;
  };

  const deleteRes = await fetch(`${baseUrl}/conversations/${created.id}`, { method: 'DELETE' });
  assert.equal(deleteRes.status, 204);

  const getRes = await fetch(`${baseUrl}/conversations/${created.id}`);
  assert.equal(getRes.status, 404);
});
