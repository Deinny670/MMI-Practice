import {
  MODULES,
  REFLECTION_PROMPTS,
  REFLECTION_AUDIO_FILES,
  STATION_TEXT_TEMPLATE,
  TRANSCRIPT_FILE_NAME,
  buildAudioSegments,
  buildMetadata,
  createQuestionText,
  createReflectionMarkdown,
  createSessionId,
  formatAnswerTranscriptMarkdown,
  getPhaseSequence,
  hasRequiredSetupInputs,
  parseStructuredStationText,
  supportsRequiredBrowserApis,
} from './core.mjs';
import {
  ensureReadWritePermission,
  loadRememberedSaveDirectoryHandle,
  rememberSaveDirectoryHandle,
  saveSessionFiles,
} from './storage.mjs';
import {
  loadOpenAiConfig,
  resolveWhisperAvailability,
  transcribeAudioWithWhisper,
} from './whisper.mjs';

const app = document.querySelector('#app');
const phases = getPhaseSequence();

const state = {
  screen: 'home',
  directoryHandle: null,
  saveFolderStatus: 'none',
  selectedModule: null,
  station: {
    stationTitle: '',
    scenario: '',
    questions: ['', '', '', ''],
  },
  stationText: '',
  statusMessage: '',
  errorMessage: '',
  phaseIndex: 0,
  remainingSeconds: phases[0].durationSeconds,
  timerId: null,
  mediaStream: null,
  mediaRecorder: null,
  audioChunks: [],
  audioBlob: null,
  completedAt: null,
  reflection: {
    summary: '',
    answerReview: '',
    structureCheck: '',
    nextStep: '',
  },
  reflectionAudio: {
    summary: null,
    answerReview: null,
    structureCheck: null,
    nextStep: null,
  },
  activeReflectionKey: null,
  reflectionRecorder: null,
  reflectionStream: null,
  reflectionChunks: [],
  answerAudioUrl: null,
  reviewAudioTime: 0,
  transcript: {
    status: 'unavailable',
    text: '',
    markdown: '',
    error: '',
    model: 'whisper-1',
    provider: 'openai-whisper',
  },
  transcriptRequestId: 0,
};

function setStatus(message) {
  state.statusMessage = message;
  state.errorMessage = '';
}

function setError(message) {
  state.errorMessage = message;
  state.statusMessage = '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function textareaValue(id) {
  return document.querySelector(`#${id}`)?.value ?? '';
}

function hasMicrophoneSupport() {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

function renderMessages() {
  return `
    ${state.statusMessage ? `<p class="message success">${escapeHtml(state.statusMessage)}</p>` : ''}
    ${state.errorMessage ? `<p class="message error">${escapeHtml(state.errorMessage)}</p>` : ''}
  `;
}

function renderSaveFolderPanel() {
  const folderName = state.directoryHandle?.name;
  const statusText = saveFolderStatusText(folderName);
  const primaryAction = state.saveFolderStatus === 'permission-needed' ? 'reconnect-folder' : 'choose-folder';
  const primaryLabel = saveFolderButtonLabel();
  return `
    <section class="panel compact" aria-labelledby="save-folder-title">
      <div>
        <h2 id="save-folder-title">Save Folder</h2>
        <p class="muted">${escapeHtml(statusText)}</p>
      </div>
      <div class="button-group">
        <button type="button" data-action="${primaryAction}">${primaryLabel}</button>
        ${state.saveFolderStatus === 'permission-needed' ? '<button type="button" class="secondary" data-action="choose-folder">Change save folder</button>' : ''}
      </div>
    </section>
  `;
}

function saveFolderStatusText(folderName) {
  if (state.saveFolderStatus === 'ready' && folderName) return `Save folder ready: ${folderName}`;
  if (state.saveFolderStatus === 'permission-needed' && folderName) {
    return `Folder remembered, permission needed: ${folderName}`;
  }
  if (state.saveFolderStatus === 'unavailable') return 'Save folder unavailable, please choose again';
  return 'No save folder selected';
}

function saveFolderButtonLabel() {
  if (state.saveFolderStatus === 'ready') return 'Change save folder';
  if (state.saveFolderStatus === 'permission-needed') return 'Reconnect folder';
  return 'Select save folder';
}

function renderHome() {
  app.innerHTML = `
    <header class="hero">
      <p class="eyebrow">Melbourne MMI practice</p>
      <h1>Focused spoken station recorder</h1>
      <p>Choose a save folder, pick one ability module, then run a timed four-question station.</p>
    </header>
    ${renderSaveFolderPanel()}
    ${renderMessages()}
    <section class="module-grid" aria-label="Ability modules">
      ${MODULES.map(
        (module) => `
          <button type="button" class="module-card" data-action="select-module" data-module="${module.slug}">
            <span>${escapeHtml(module.name)}</span>
          </button>
        `,
      ).join('')}
    </section>
  `;
}

function renderSetup() {
  const canStart = canAttemptStationStart();
  app.innerHTML = `
    <header class="page-header">
      <button type="button" class="secondary" data-action="back-home">Back</button>
      <div>
        <p class="eyebrow">Selected module</p>
        <h1>${escapeHtml(state.selectedModule.name)}</h1>
      </div>
    </header>
    ${renderSaveFolderPanel()}
    ${renderMessages()}
    <form class="panel form-grid" data-form="station">
      <section class="station-instructions" aria-labelledby="station-input-title">
        <h2 id="station-input-title">Paste one structured station</h2>
        <p>
          Ask AI to create one Melbourne-style MMI station for the selected module using exactly this format:
          Station Title, Scenario / Context, Question 1, Question 2, Question 3, Question 4.
          Paste the full formatted station below.
        </p>
        <pre class="template-box">${escapeHtml(STATION_TEXT_TEMPLATE)}</pre>
      </section>
      <label>
        Structured station text <span class="required">required</span>
        <textarea id="station-text" class="station-textarea" name="stationText" rows="18" placeholder="${escapeHtml(STATION_TEXT_TEMPLATE)}">${escapeHtml(state.stationText)}</textarea>
      </label>
      <div class="action-row">
        <button type="button" data-action="start-station" ${canStart ? '' : 'disabled'}>Start Station</button>
        <p class="muted">${setupReadinessMessage(canStart)}</p>
      </div>
    </form>
  `;
}

function setupReadinessMessage(canStart) {
  if (canStart) return 'Ready: paste is present, save folder is selected, and microphone support is available.';
  if (state.saveFolderStatus === 'permission-needed') return 'Reconnect the remembered save folder before starting.';
  if (state.saveFolderStatus !== 'ready') return 'Select a save folder before starting.';
  if (!hasMicrophoneSupport()) return 'Chrome or Edge with microphone recording support is required.';
  return 'Paste the full structured station text before starting.';
}

function canAttemptStationStart() {
  return Boolean(state.directoryHandle && state.saveFolderStatus === 'ready' && hasMicrophoneSupport() && state.stationText.trim());
}

function updateSetupAvailability() {
  if (state.screen !== 'setup') return;
  const canStart = canAttemptStationStart();
  const button = document.querySelector('[data-action="start-station"]');
  const message = document.querySelector('.action-row .muted');
  if (button) button.disabled = !canStart;
  if (message) message.textContent = setupReadinessMessage(canStart);
}

function currentPhase() {
  return phases[state.phaseIndex];
}

function renderPractice() {
  const phase = currentPhase();
  const questionText = phase.questionNumber ? state.station.questions[phase.questionNumber - 1] : null;
  app.innerHTML = `
    <section class="practice-card">
      <p class="eyebrow">${escapeHtml(state.selectedModule.name)}</p>
      <h1>${escapeHtml(phase.label)}</h1>
      <div class="timer" aria-label="Seconds remaining">${state.remainingSeconds}</div>
      <p class="recording-state">${recordingStatusText(phase)}</p>
      <div class="prompt-box">
        ${phase.id === 'scenario_reading' ? `<h2>Scenario</h2><p>${escapeHtml(state.station.scenario || 'No scenario was entered.')}</p>` : ''}
        ${questionText ? `<h2>Question ${phase.questionNumber}</h2><p>${escapeHtml(questionText)}</p>` : ''}
        ${phase.id === 'complete' ? '<h2>Station complete</h2><p>Preparing your reflection screen.</p>' : ''}
      </div>
    </section>
  `;
}

function recordingStatusText(phase) {
  if (!state.mediaRecorder) return 'Microphone ready';
  if (phase.recording) return 'Recording...';
  if (state.audioBlob) return 'Recording complete';
  return 'Microphone ready';
}

function renderReflection() {
  persistReviewAudioPosition();
  app.innerHTML = `
    <header class="page-header">
      <button type="button" class="secondary" data-action="back-home">Back to Home</button>
      <div>
        <p class="eyebrow">Station complete</p>
        <h1>Reflection</h1>
      </div>
    </header>
    ${renderMessages()}
    <section class="panel summary">
      <p><strong>Module:</strong> ${escapeHtml(state.selectedModule.name)}</p>
      <p><strong>Station title:</strong> ${escapeHtml(state.station.stationTitle || 'Untitled station')}</p>
      <p><strong>Completion time:</strong> ${escapeHtml(state.completedAt?.toLocaleString() ?? '')}</p>
      <p><strong>Recording:</strong> ${state.audioBlob ? 'Recording complete' : 'Recording finalising'}</p>
    </section>
    ${renderResponseReview()}
    <form class="panel form-grid" data-form="reflection">
      ${Object.entries(REFLECTION_PROMPTS).map(
        ([key, prompt]) => `
          <div class="reflection-field">
            <label for="reflection-${key}">${escapeHtml(prompt)}</label>
            <textarea id="reflection-${key}" rows="4">${escapeHtml(state.reflection[key])}</textarea>
            <button
              type="button"
              class="mic-button ${state.activeReflectionKey === key ? 'recording' : ''}"
              data-action="toggle-reflection-recording"
              data-reflection-key="${key}"
              aria-pressed="${state.activeReflectionKey === key ? 'true' : 'false'}"
            >
              ${state.activeReflectionKey === key ? 'Stop' : 'Mic'}
            </button>
            <p class="voice-note-status">
              ${reflectionAudioStatus(key)}
            </p>
          </div>
        `,
      ).join('')}
      <div class="action-row">
        <button type="button" data-action="save-session" ${state.audioBlob ? '' : 'disabled'}>Save Session</button>
        <button type="button" class="secondary" data-action="back-home">Back to Home</button>
        <p class="muted">Saving writes the station files, transcript when ready, and any recorded voice reflections.</p>
      </div>
    </form>
  `;
  restoreReviewAudioPosition();
}

function renderResponseReview() {
  const segments = buildAudioSegments();
  const questions = state.station.questions ?? [];
  return `
    <section class="panel response-review" aria-labelledby="response-review-title">
      <div>
        <h2 id="response-review-title">Response Review</h2>
        <p class="muted">Replay your spoken answers and read the transcript before saving.</p>
      </div>
      ${
        state.answerAudioUrl
          ? `
            <audio id="answer-review-audio" controls src="${escapeHtml(state.answerAudioUrl)}"></audio>
            <div class="segment-actions" role="group" aria-label="Jump to question answers">
              ${[1, 2, 3, 4]
                .map((questionNumber) => {
                  const key = `q${questionNumber}`;
                  const segment = segments[key];
                  const questionText = questions[questionNumber - 1] || '';
                  return `
                    <button
                      type="button"
                      class="secondary segment-button"
                      data-action="seek-answer-segment"
                      data-start-seconds="${segment.startSeconds}"
                      title="${escapeHtml(questionText)}"
                    >
                      Question ${questionNumber}
                    </button>
                  `;
                })
                .join('')}
            </div>
          `
          : '<p class="message error">Spoken answers are unavailable for review.</p>'
      }
      <div class="transcript-review">
        <h3>Transcript</h3>
        <p class="transcript-status">${escapeHtml(transcriptStatusText())}</p>
        ${
          state.transcript.status === 'ready'
            ? `<pre class="transcript-body">${escapeHtml(state.transcript.text)}</pre>`
            : ''
        }
        ${
          state.transcript.status === 'failed' || state.transcript.status === 'unavailable'
            ? `<button type="button" class="secondary" data-action="retry-transcript">Retry transcript</button>`
            : ''
        }
      </div>
    </section>
  `;
}

function transcriptStatusText() {
  if (state.transcript.status === 'transcribing') return 'Transcribing...';
  if (state.transcript.status === 'ready') return 'Transcript ready';
  if (state.transcript.status === 'failed') {
    return `Transcript failed${state.transcript.error ? `: ${state.transcript.error}` : '.'}`;
  }
  return state.transcript.error
    ? `Transcript unavailable. ${state.transcript.error}`
    : 'Transcript unavailable.';
}

function persistReviewAudioPosition() {
  const audio = document.querySelector('#answer-review-audio');
  if (audio && Number.isFinite(audio.currentTime)) {
    state.reviewAudioTime = audio.currentTime;
  }
}

function restoreReviewAudioPosition() {
  const audio = document.querySelector('#answer-review-audio');
  if (!audio) return;
  const restore = () => {
    if (Number.isFinite(state.reviewAudioTime) && state.reviewAudioTime > 0) {
      try {
        audio.currentTime = state.reviewAudioTime;
      } catch {
        // Ignore seek errors before metadata is ready.
      }
    }
  };
  if (audio.readyState >= 1) restore();
  else audio.addEventListener('loadedmetadata', restore, { once: true });
}

function ensureAnswerAudioUrl() {
  if (!state.audioBlob) return;
  if (state.answerAudioUrl) URL.revokeObjectURL(state.answerAudioUrl);
  state.answerAudioUrl = URL.createObjectURL(state.audioBlob);
  state.reviewAudioTime = 0;
}

function clearAnswerAudioUrl() {
  if (state.answerAudioUrl) {
    URL.revokeObjectURL(state.answerAudioUrl);
  }
  state.answerAudioUrl = null;
  state.reviewAudioTime = 0;
}

function resetTranscriptState(extra = {}) {
  state.transcript = {
    status: 'unavailable',
    text: '',
    markdown: '',
    error: '',
    model: 'whisper-1',
    provider: 'openai-whisper',
    ...extra,
  };
}

async function startTranscription() {
  if (!state.audioBlob) {
    resetTranscriptState({ status: 'unavailable', error: 'Spoken answers are unavailable for transcription.' });
    return;
  }

  const requestId = state.transcriptRequestId + 1;
  state.transcriptRequestId = requestId;
  state.transcript = {
    ...state.transcript,
    status: 'transcribing',
    text: '',
    markdown: '',
    error: '',
  };
  if (state.screen === 'reflection') {
    persistReflectionForm();
    render();
  }

  try {
    const config = await loadOpenAiConfig();
    const availability = await resolveWhisperAvailability(config);
    if (state.transcriptRequestId !== requestId) return;

    if (!availability.available) {
      resetTranscriptState({
        status: 'unavailable',
        error: availability.reason,
        model: availability.config.model,
      });
      if (state.screen === 'reflection') {
        persistReflectionForm();
        render();
      }
      return;
    }

    const result = await transcribeAudioWithWhisper(state.audioBlob, availability.config);
    if (state.transcriptRequestId !== requestId) return;

    const markdown = formatAnswerTranscriptMarkdown({ text: result.text });
    state.transcript = {
      status: 'ready',
      text: result.text,
      markdown,
      error: '',
      model: result.model,
      provider: result.provider,
    };
  } catch (error) {
    if (state.transcriptRequestId !== requestId) return;
    resetTranscriptState({
      status: 'failed',
      error: error?.message || 'Whisper transcription failed.',
    });
  }

  if (state.screen === 'reflection') {
    persistReflectionForm();
    render();
  }
}

function seekAnswerSegment(startSeconds) {
  const audio = document.querySelector('#answer-review-audio');
  if (!audio) {
    setError('Spoken answers are unavailable for review.');
    render();
    return;
  }
  const target = Number(startSeconds);
  const applySeek = () => {
    audio.currentTime = target;
    state.reviewAudioTime = target;
    audio.play().catch(() => {
      setError('Audio playback failed. You can retry from the Response Review controls.');
      render();
    });
  };
  if (audio.readyState >= 1) applySeek();
  else audio.addEventListener('loadedmetadata', applySeek, { once: true });
}

function reflectionAudioStatus(key) {
  if (state.activeReflectionKey === key) return 'Recording voice reflection...';
  if (state.reflectionAudio[key]) return `Voice reflection ready: ${REFLECTION_AUDIO_FILES[key]}`;
  return 'Optional voice reflection';
}

function render() {
  if (state.screen === 'setup') renderSetup();
  else if (state.screen === 'practice') renderPractice();
  else if (state.screen === 'reflection') renderReflection();
  else renderHome();
}

function persistStationForm() {
  state.stationText = textareaValue('station-text');
}

function persistReflectionForm() {
  Object.keys(REFLECTION_PROMPTS).forEach((key) => {
    state.reflection[key] = textareaValue(`reflection-${key}`);
  });
}

function resetSessionState() {
  clearInterval(state.timerId);
  clearAnswerAudioUrl();
  state.transcriptRequestId += 1;
  resetTranscriptState();
  state.selectedModule = null;
  state.station = {
    stationTitle: '',
    scenario: '',
    questions: ['', '', '', ''],
  };
  state.stationText = '';
  state.phaseIndex = 0;
  state.remainingSeconds = phases[0].durationSeconds;
  state.audioChunks = [];
  state.audioBlob = null;
  state.completedAt = null;
  state.reflection = {
    summary: '',
    answerReview: '',
    structureCheck: '',
    nextStep: '',
  };
  state.reflectionAudio = {
    summary: null,
    answerReview: null,
    structureCheck: null,
    nextStep: null,
  };
}

function goHome() {
  persistStationForm();
  persistReflectionForm();
  resetSessionState();
  state.screen = 'home';
  setStatus('');
  render();
}

async function chooseFolder() {
  if (!window.showDirectoryPicker) {
    setError('Chrome or Edge is required for real local folder saving.');
    render();
    return;
  }
  try {
    state.directoryHandle = await window.showDirectoryPicker();
    state.saveFolderStatus = 'ready';
    const remembered = await rememberSaveDirectoryHandle(state.directoryHandle);
    setStatus(
      remembered
        ? `Save folder ready: ${state.directoryHandle.name}`
        : `Save folder selected for this session, but it cannot be remembered by this browser.`,
    );
  } catch (error) {
    state.saveFolderStatus = state.directoryHandle ? state.saveFolderStatus : 'none';
    setError(error?.name === 'AbortError' ? 'No save folder selected.' : 'Could not select save folder.');
  }
  render();
}

async function reconnectFolder() {
  if (!state.directoryHandle) {
    state.saveFolderStatus = 'none';
    setError('No remembered save folder is available. Please choose a folder again.');
    render();
    return;
  }

  const hasPermission = await ensureReadWritePermission(state.directoryHandle);
  if (hasPermission) {
    state.saveFolderStatus = 'ready';
    setStatus(`Save folder ready: ${state.directoryHandle.name}`);
  } else {
    state.saveFolderStatus = 'permission-needed';
    setError('Permission is needed before saving. Reconnect the folder or choose a different folder.');
  }
  render();
}

function selectModule(moduleSlug) {
  state.selectedModule = MODULES.find((module) => module.slug === moduleSlug);
  state.screen = 'setup';
  setStatus('');
  render();
}

async function startStation() {
  persistStationForm();
  if (!state.directoryHandle || state.saveFolderStatus !== 'ready') {
    setError('Choose a save folder before starting the station.');
    render();
    return;
  }
  if (!supportsRequiredBrowserApis(window)) {
    setError('Chrome or Edge with File System Access and microphone recording support is required.');
    render();
    return;
  }
  if (!state.stationText.trim()) {
    setError('Paste the full structured station text before starting.');
    render();
    return;
  }

  const parseResult = parseStructuredStationText(state.stationText);
  if (!parseResult.ok) {
    setError(parseResult.message);
    render();
    return;
  }

  state.station = parseResult.station;
  if (!hasRequiredSetupInputs({ station: state.station, hasSaveFolder: true, hasMicrophoneSupport: true })) {
    setError('Missing: Question 1, Question 2, Question 3, or Question 4');
    render();
    return;
  }

  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    clearAnswerAudioUrl();
    state.transcriptRequestId += 1;
    resetTranscriptState();
    state.audioChunks = [];
    state.audioBlob = null;
    state.mediaRecorder = new MediaRecorder(state.mediaStream);
    state.mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) state.audioChunks.push(event.data);
    });
    state.mediaRecorder.addEventListener('stop', () => {
      state.audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
      state.mediaStream.getTracks().forEach((track) => track.stop());
      ensureAnswerAudioUrl();
      state.screen = 'reflection';
      render();
      startTranscription();
    });
    state.phaseIndex = 0;
    state.remainingSeconds = phases[0].durationSeconds;
    state.screen = 'practice';
    setStatus('');
    render();
    startTimer();
  } catch {
    setError('Microphone access is required before timed practice can begin.');
    render();
  }
}

function stopActiveReflectionRecording() {
  return new Promise((resolve) => {
    const recorder = state.reflectionRecorder;
    if (!recorder || recorder.state !== 'recording') {
      resolve();
      return;
    }
    recorder.addEventListener('stop', resolve, { once: true });
    recorder.stop();
  });
}

async function toggleReflectionRecording(key) {
  persistReflectionForm();
  if (!hasMicrophoneSupport()) {
    setError('Chrome or Edge with microphone recording support is required.');
    render();
    return;
  }

  if (state.activeReflectionKey === key) {
    await stopActiveReflectionRecording();
    return;
  }

  if (state.activeReflectionKey) {
    await stopActiveReflectionRecording();
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    state.reflectionStream = stream;
    state.reflectionRecorder = recorder;
    state.reflectionChunks = [];
    state.activeReflectionKey = key;
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) state.reflectionChunks.push(event.data);
    });
    recorder.addEventListener('stop', () => {
      state.reflectionAudio[key] = new Blob(state.reflectionChunks, { type: 'audio/webm' });
      stream.getTracks().forEach((track) => track.stop());
      state.activeReflectionKey = null;
      state.reflectionRecorder = null;
      state.reflectionStream = null;
      state.reflectionChunks = [];
      setStatus(`Voice reflection recorded: ${REFLECTION_AUDIO_FILES[key]}`);
      render();
    });
    recorder.start();
    setStatus('');
    render();
  } catch {
    setError(`Microphone access is required to record this reflection prompt: ${REFLECTION_PROMPTS[key]}`);
    render();
  }
}

function startTimer() {
  clearInterval(state.timerId);
  state.timerId = setInterval(() => {
    if (state.remainingSeconds > 0) {
      state.remainingSeconds -= 1;
      render();
      return;
    }
    advancePhase();
  }, 1000);
}

function advancePhase() {
  const nextIndex = Math.min(state.phaseIndex + 1, phases.length - 1);
  state.phaseIndex = nextIndex;
  const phase = currentPhase();
  state.remainingSeconds = phase.durationSeconds;

  if (phase.id === 'q1_answer' && state.mediaRecorder?.state === 'inactive') {
    state.mediaRecorder.start();
  }
  if (phase.id === 'complete') {
    clearInterval(state.timerId);
    state.completedAt = new Date();
    if (state.mediaRecorder?.state === 'recording') {
      state.mediaRecorder.stop();
    } else {
      ensureAnswerAudioUrl();
      state.screen = 'reflection';
      render();
      startTranscription();
      return;
    }
  }
  render();
}

function localIsoString(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
  const minutes = String(absoluteOffset % 60).padStart(2, '0');
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}${sign}${hours}:${minutes}`;
}

async function saveSession() {
  persistReflectionForm();
  if (state.activeReflectionKey) {
    await stopActiveReflectionRecording();
  }
  if (!state.audioBlob) {
    setError('Recording is not ready yet. Wait for recording to finish before saving.');
    render();
    return;
  }
  try {
    const createdAt = state.completedAt ?? new Date();
    const sessionId = createSessionId({
      createdAt,
      moduleSlug: state.selectedModule.slug,
      stationTitle: state.station.stationTitle,
    });
    const questionText = createQuestionText({
      module: state.selectedModule.name,
      stationTitle: state.station.stationTitle,
      scenario: state.station.scenario,
      questions: state.station.questions,
    });
    const reflectionMarkdown = createReflectionMarkdown({ responses: state.reflection });
    const reflectionAudioFiles = Object.fromEntries(
      Object.entries(state.reflectionAudio)
        .filter(([, blob]) => blob)
        .map(([key, blob]) => [key, { fileName: REFLECTION_AUDIO_FILES[key], blob }]),
    );
    const reflectionAudioMetadata = Object.fromEntries(
      Object.entries(reflectionAudioFiles).map(([key, value]) => [key, value.fileName]),
    );
    const metadata = buildMetadata({
      sessionId,
      createdAtIso: localIsoString(createdAt),
      module: state.selectedModule.name,
      stationTitle: state.station.stationTitle,
      reflectionAudioFiles: reflectionAudioMetadata,
      transcript: {
        status: state.transcript.status,
        provider: state.transcript.provider,
        model: state.transcript.model,
        ...(state.transcript.error ? { error: state.transcript.error } : {}),
      },
    });

    const result = await saveSessionFiles({
      directoryHandle: state.directoryHandle,
      sessionId,
      questionText,
      audioBlob: state.audioBlob,
      reflectionMarkdown,
      metadata,
      reflectionAudioFiles,
      transcriptMarkdown: state.transcript.status === 'ready' ? state.transcript.markdown : null,
    });
    setStatus(
      state.transcript.status === 'ready'
        ? `Session saved to ${result.sessionId}, including ${TRANSCRIPT_FILE_NAME}.`
        : `Session saved to ${result.sessionId}.`,
    );
    state.saveFolderStatus = 'ready';
  } catch (error) {
    if (String(error.message).includes('permission')) {
      state.saveFolderStatus = 'permission-needed';
    }
    setError(`Save failed: ${error.message}`);
  }
  render();
}

async function restoreRememberedSaveFolder() {
  const rememberedHandle = await loadRememberedSaveDirectoryHandle();
  if (!rememberedHandle) {
    state.saveFolderStatus = 'none';
    render();
    return;
  }

  state.directoryHandle = rememberedHandle;
  try {
    const permission = await rememberedHandle.queryPermission({ mode: 'readwrite' });
    state.saveFolderStatus = permission === 'granted' ? 'ready' : 'permission-needed';
  } catch {
    state.directoryHandle = null;
    state.saveFolderStatus = 'unavailable';
  }
  render();
}

app.addEventListener('click', async (event) => {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;
  const { action } = actionTarget.dataset;
  if (action === 'choose-folder') chooseFolder();
  if (action === 'reconnect-folder') reconnectFolder();
  if (action === 'select-module') selectModule(actionTarget.dataset.module);
  if (action === 'back-home') {
    if (state.activeReflectionKey) {
      await stopActiveReflectionRecording();
    }
    goHome();
  }
  if (action === 'start-station') startStation();
  if (action === 'toggle-reflection-recording') toggleReflectionRecording(actionTarget.dataset.reflectionKey);
  if (action === 'seek-answer-segment') seekAnswerSegment(actionTarget.dataset.startSeconds);
  if (action === 'retry-transcript') startTranscription();
  if (action === 'save-session') saveSession();
});

app.addEventListener('input', (event) => {
  if (event.target.closest('[data-form="station"]')) {
    persistStationForm();
    updateSetupAvailability();
  }
  if (event.target.closest('[data-form="reflection"]')) {
    persistReflectionForm();
  }
});

render();
restoreRememberedSaveFolder();
