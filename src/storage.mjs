const REQUIRED_FILES = ['question.txt', 'answer.webm', 'reflection.md', 'metadata.json'];
const SETTINGS_DB_NAME = 'mmi-practice-tool';
const SETTINGS_DB_VERSION = 1;
const SETTINGS_STORE_NAME = 'settings';
const SAVE_DIRECTORY_HANDLE_KEY = 'saveDirectoryHandle';

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

async function openSettingsDatabase(indexedDBLike = globalThis.indexedDB) {
  if (!indexedDBLike) {
    throw new Error('IndexedDB is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDBLike.open(SETTINGS_DB_NAME, SETTINGS_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        database.createObjectStore(SETTINGS_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB could not be opened.'));
  });
}

export async function rememberSaveDirectoryHandle(directoryHandle, { indexedDB = globalThis.indexedDB } = {}) {
  try {
    const database = await openSettingsDatabase(indexedDB);
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readwrite');
    transaction.objectStore(SETTINGS_STORE_NAME).put(directoryHandle, SAVE_DIRECTORY_HANDLE_KEY);
    await transactionDone(transaction);
    database.close?.();
    return true;
  } catch {
    return false;
  }
}

export async function loadRememberedSaveDirectoryHandle({ indexedDB = globalThis.indexedDB } = {}) {
  try {
    const database = await openSettingsDatabase(indexedDB);
    const transaction = database.transaction(SETTINGS_STORE_NAME, 'readonly');
    const request = transaction.objectStore(SETTINGS_STORE_NAME).get(SAVE_DIRECTORY_HANDLE_KEY);
    const directoryHandle = await requestResult(request);
    await transactionDone(transaction);
    database.close?.();
    return directoryHandle ?? null;
  } catch {
    return null;
  }
}

export async function ensureReadWritePermission(directoryHandle) {
  const options = { mode: 'readwrite' };
  if ((await directoryHandle.queryPermission(options)) === 'granted') {
    return true;
  }
  return (await directoryHandle.requestPermission(options)) === 'granted';
}

async function writeFile(directoryHandle, fileName, content) {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function saveSessionFiles({
  directoryHandle,
  sessionId,
  questionText,
  audioBlob,
  reflectionMarkdown,
  metadata,
  reflectionAudioFiles = {},
  transcriptMarkdown = null,
}) {
  const hasPermission = await ensureReadWritePermission(directoryHandle);
  if (!hasPermission) {
    throw new Error('Save folder permission was denied.');
  }

  const sessionFolder = await directoryHandle.getDirectoryHandle(sessionId, { create: true });
  await writeFile(sessionFolder, 'question.txt', questionText);
  await writeFile(sessionFolder, 'answer.webm', audioBlob);
  await writeFile(sessionFolder, 'reflection.md', reflectionMarkdown);

  const optionalFiles = [];
  if (transcriptMarkdown) {
    await writeFile(sessionFolder, 'answer-transcript.md', transcriptMarkdown);
    optionalFiles.push('answer-transcript.md');
  }

  for (const { fileName, blob } of Object.values(reflectionAudioFiles)) {
    await writeFile(sessionFolder, fileName, blob);
    optionalFiles.push(fileName);
  }

  await writeFile(sessionFolder, 'metadata.json', JSON.stringify(metadata, null, 2));

  return {
    sessionId,
    files: [...REQUIRED_FILES, ...optionalFiles],
  };
}
