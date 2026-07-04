import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureReadWritePermission,
  loadRememberedSaveDirectoryHandle,
  rememberSaveDirectoryHandle,
  saveSessionFiles,
} from '../src/storage.mjs';

function createWritableCollector(target) {
  return {
    async write(content) {
      target.content = content;
    },
    async close() {
      target.closed = true;
    },
  };
}

function createFakeDirectoryHandle({ permission = 'granted' } = {}) {
  const files = new Map();
  const directories = new Map();
  const handle = {
    name: 'Melbourne MMI Practice',
    kind: 'directory',
    files,
    directories,
    async queryPermission(options) {
      assert.deepEqual(options, { mode: 'readwrite' });
      return permission;
    },
    async requestPermission(options) {
      assert.deepEqual(options, { mode: 'readwrite' });
      permission = 'granted';
      return permission;
    },
    async getDirectoryHandle(name, options) {
      assert.deepEqual(options, { create: true });
      const child = createFakeDirectoryHandle({ permission });
      directories.set(name, child);
      return child;
    },
    async getFileHandle(name, options) {
      assert.deepEqual(options, { create: true });
      const file = {};
      files.set(name, file);
      return {
        async createWritable() {
          return createWritableCollector(file);
        },
      };
    },
  };
  return handle;
}

function createFakeIndexedDB({ failOpen = false } = {}) {
  const stores = new Map();
  const objectStoreNames = {
    contains(name) {
      return stores.has(name);
    },
  };

  function completeTransaction(transaction) {
    setTimeout(() => transaction.oncomplete?.(), 0);
  }

  const database = {
    objectStoreNames,
    createObjectStore(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      return stores.get(name);
    },
    transaction(storeName) {
      const store = stores.get(storeName);
      const transaction = {
        objectStore() {
          return {
            put(value, key) {
              store.set(key, value);
              completeTransaction(transaction);
              return {};
            },
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = store.get(key);
                request.onsuccess?.();
                completeTransaction(transaction);
              });
              return request;
            },
          };
        },
      };
      return transaction;
    },
    close() {},
  };

  return {
    stores,
    open(name, version) {
      const request = {};
      queueMicrotask(() => {
        if (failOpen) {
          request.error = new Error('IndexedDB failed');
          request.onerror?.();
          return;
        }
        request.result = database;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      request.name = name;
      request.version = version;
      return request;
    },
  };
}

test('requests read/write permission when it is not already granted', async () => {
  const handle = createFakeDirectoryHandle({ permission: 'prompt' });

  assert.equal(await ensureReadWritePermission(handle), true);
});

test('returns false when read/write permission is denied', async () => {
  const handle = {
    async queryPermission() {
      return 'denied';
    },
    async requestPermission() {
      return 'denied';
    },
  };

  assert.equal(await ensureReadWritePermission(handle), false);
});

test('saves all required session files in a child session folder', async () => {
  const rootHandle = createFakeDirectoryHandle();

  const result = await saveSessionFiles({
    directoryHandle: rootHandle,
    sessionId: '2026-08-12_09-30_ethics-decision-making',
    questionText: 'question text',
    reflectionMarkdown: '# Reflection',
    metadata: { sessionId: '2026-08-12_09-30_ethics-decision-making' },
    audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
  });

  assert.deepEqual(result, {
    sessionId: '2026-08-12_09-30_ethics-decision-making',
    files: ['question.txt', 'answer.webm', 'reflection.md', 'metadata.json'],
  });

  const sessionFolder = rootHandle.directories.get('2026-08-12_09-30_ethics-decision-making');
  assert.equal(sessionFolder.files.get('question.txt').content, 'question text');
  assert.equal(sessionFolder.files.get('answer.webm').content.type, 'audio/webm');
  assert.equal(sessionFolder.files.get('reflection.md').content, '# Reflection');
  assert.equal(
    sessionFolder.files.get('metadata.json').content,
    JSON.stringify({ sessionId: '2026-08-12_09-30_ethics-decision-making' }, null, 2),
  );
  assert.ok(sessionFolder.files.get('metadata.json').closed);
});

test('saves optional reflection audio files in the session folder', async () => {
  const rootHandle = createFakeDirectoryHandle();

  const result = await saveSessionFiles({
    directoryHandle: rootHandle,
    sessionId: '2026-08-12_09-30_ethics-decision-making',
    questionText: 'question text',
    reflectionMarkdown: '# Reflection',
    metadata: { sessionId: '2026-08-12_09-30_ethics-decision-making' },
    audioBlob: new Blob(['audio'], { type: 'audio/webm' }),
    reflectionAudioFiles: {
      summary: {
        fileName: 'reflection-01-summary.webm',
        blob: new Blob(['summary'], { type: 'audio/webm' }),
      },
    },
  });

  assert.deepEqual(result.files, [
    'question.txt',
    'answer.webm',
    'reflection.md',
    'metadata.json',
    'reflection-01-summary.webm',
  ]);

  const sessionFolder = rootHandle.directories.get('2026-08-12_09-30_ethics-decision-making');
  assert.equal(sessionFolder.files.get('reflection-01-summary.webm').content.type, 'audio/webm');
});

test('persists and restores the save directory handle from IndexedDB settings', async () => {
  const indexedDB = createFakeIndexedDB();
  const handle = createFakeDirectoryHandle();

  await rememberSaveDirectoryHandle(handle, { indexedDB });
  const restored = await loadRememberedSaveDirectoryHandle({ indexedDB });

  assert.equal(restored, handle);
  assert.equal(indexedDB.stores.get('settings').get('saveDirectoryHandle'), handle);
});

test('returns null when IndexedDB is unavailable or cannot be opened', async () => {
  assert.equal(await loadRememberedSaveDirectoryHandle({ indexedDB: null }), null);
  assert.equal(await loadRememberedSaveDirectoryHandle({ indexedDB: createFakeIndexedDB({ failOpen: true }) }), null);
});

test('does not block current-session folder use when IndexedDB persistence fails', async () => {
  const handle = createFakeDirectoryHandle();

  await assert.doesNotReject(() => rememberSaveDirectoryHandle(handle, { indexedDB: null }));
  await assert.doesNotReject(() => rememberSaveDirectoryHandle(handle, { indexedDB: createFakeIndexedDB({ failOpen: true }) }));
});
