import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MODULES,
  REFLECTION_AUDIO_FILES,
  TIMING,
  buildAudioSegments,
  buildMetadata,
  createQuestionText,
  createReflectionMarkdown,
  createSessionId,
  getPhaseSequence,
  hasRequiredSetupInputs,
  parseStructuredStationText,
  supportsRequiredBrowserApis,
} from '../src/core.mjs';

test('defines the nine required ability modules in order', () => {
  assert.equal(MODULES.length, 9);
  assert.deepEqual(
    MODULES.map((module) => module.name),
    [
      'Motivation / Course Fit',
      'Communication / Rapport',
      'Professional Behaviour',
      'Ethics / Decision-Making',
      'Teamwork / Collaboration',
      'Reflection / Feedback',
      'Public Health / Social Awareness',
      'De-technicalisation',
      'Cultural Safety / Equity',
    ],
  );
  assert.ok(MODULES.every((module) => module.slug && module.description));
});

test('creates filesystem-safe readable session ids', () => {
  const date = new Date('2026-08-12T09:30:00.000Z');

  assert.equal(
    createSessionId({
      createdAt: date,
      moduleSlug: 'ethics-decision-making',
      stationTitle: 'Friend stealing at work!',
      timeZone: 'UTC',
    }),
    '2026-08-12_09-30_ethics-decision-making_friend-stealing-at-work',
  );
});

test('formats question.txt with the exact station data', () => {
  const text = createQuestionText({
    module: 'Ethics / Decision-Making',
    stationTitle: 'Friend stealing at work',
    scenario: 'A colleague claims your idea as their own.',
    questions: ['What is the issue?', 'What would you do?', 'Who is affected?', 'How would you reflect?'],
  });

  assert.equal(
    text,
    [
      'Module: Ethics / Decision-Making',
      'Station Title: Friend stealing at work',
      '',
      'Scenario:',
      'A colleague claims your idea as their own.',
      '',
      'Question 1:',
      'What is the issue?',
      '',
      'Question 2:',
      'What would you do?',
      '',
      'Question 3:',
      'Who is affected?',
      '',
      'Question 4:',
      'How would you reflect?',
      '',
    ].join('\n'),
  );
});

test('formats reflection.md with all four fixed headings, even when blank', () => {
  const markdown = createReflectionMarkdown({
    responses: {
      summary: 'I named the issue and chose a private conversation.',
      answerReview: 'I was clear, but I should name stakeholders earlier.',
      structureCheck: '',
      nextStep: 'Practise making the final action more concrete.',
    },
  });

  assert.equal(
    markdown,
    [
      '# Reflection',
      '',
      '## Briefly summarize how you approached this station.',
      '',
      'I named the issue and chose a private conversation.',
      '',
      '## What did I do well, and what would I change if I answered again?',
      '',
      'I was clear, but I should name stakeholders earlier.',
      '',
      '## Did I show structure, empathy, professionalism, and a clear next step?',
      '',
      '',
      '',
      '## What is one specific thing I should practise or improve in the next station?',
      '',
      'Practise making the final action more concrete.',
      '',
    ].join('\n'),
  );
});

test('builds metadata with required file names, timing values, and answer segment offsets', () => {
  const metadata = buildMetadata({
    sessionId: '2026-08-12_09-30_ethics-decision-making_friend-stealing-at-work',
    createdAtIso: '2026-08-12T19:30:00+10:00',
    module: 'Ethics / Decision-Making',
    stationTitle: 'Friend stealing at work',
  });

  assert.deepEqual(metadata.timing, {
    scenarioReadSeconds: 30,
    questionPrepSeconds: 15,
    answerSeconds: 60,
    questionCount: 4,
  });
  assert.deepEqual(metadata.files, {
    question: 'question.txt',
    audio: 'answer.webm',
    reflection: 'reflection.md',
  });
  assert.deepEqual(metadata.audioSegments, {
    q1: { startSeconds: 0, endSeconds: 60 },
    q2: { startSeconds: 75, endSeconds: 135 },
    q3: { startSeconds: 150, endSeconds: 210 },
    q4: { startSeconds: 225, endSeconds: 285 },
  });
});

test('builds metadata with optional reflection audio file references', () => {
  const metadata = buildMetadata({
    sessionId: '2026-08-12_09-30_ethics-decision-making_friend-stealing-at-work',
    createdAtIso: '2026-08-12T19:30:00+10:00',
    module: 'Ethics / Decision-Making',
    stationTitle: 'Friend stealing at work',
    reflectionAudioFiles: {
      summary: REFLECTION_AUDIO_FILES.summary,
      answerReview: REFLECTION_AUDIO_FILES.answerReview,
    },
  });

  assert.deepEqual(metadata.files.reflectionAudio, {
    summary: 'reflection-01-summary.webm',
    answerReview: 'reflection-02-answer-review.webm',
  });
});

test('exposes the exact fixed timing phase sequence', () => {
  assert.deepEqual(TIMING, {
    scenarioReadSeconds: 30,
    questionPrepSeconds: 15,
    answerSeconds: 60,
    questionCount: 4,
  });
  assert.deepEqual(
    getPhaseSequence().map((phase) => phase.id),
    [
      'scenario_reading',
      'q1_prep',
      'q1_answer',
      'q2_prep',
      'q2_answer',
      'q3_prep',
      'q3_answer',
      'q4_prep',
      'q4_answer',
      'complete',
    ],
  );
  assert.deepEqual(buildAudioSegments(), {
    q1: { startSeconds: 0, endSeconds: 60 },
    q2: { startSeconds: 75, endSeconds: 135 },
    q3: { startSeconds: 150, endSeconds: 210 },
    q4: { startSeconds: 225, endSeconds: 285 },
  });
});

test('requires save folder, four questions, and browser microphone support before station start', () => {
  const station = {
    questions: ['Q1', 'Q2', 'Q3', 'Q4'],
  };

  assert.equal(hasRequiredSetupInputs({ station, hasSaveFolder: true, hasMicrophoneSupport: true }), true);
  assert.equal(hasRequiredSetupInputs({ station, hasSaveFolder: false, hasMicrophoneSupport: true }), false);
  assert.equal(
    hasRequiredSetupInputs({ station: { questions: ['Q1', 'Q2', '', 'Q4'] }, hasSaveFolder: true, hasMicrophoneSupport: true }),
    false,
  );
  assert.equal(hasRequiredSetupInputs({ station, hasSaveFolder: true, hasMicrophoneSupport: false }), false);
});

test('checks for required browser APIs explicitly', () => {
  assert.equal(
    supportsRequiredBrowserApis({
      showDirectoryPicker: () => {},
      navigator: { mediaDevices: { getUserMedia: () => {} } },
      MediaRecorder: function MediaRecorder() {},
    }),
    true,
  );
  assert.equal(supportsRequiredBrowserApis({ navigator: { mediaDevices: {} } }), false);
});

test('parses a valid structured station text block', () => {
  const result = parseStructuredStationText(`Station Title:
Friend stealing at work

Scenario / Context:
You and your friend both started working in a sports store over the summer holidays.
You recently noticed that your friend has started stealing shoes and sporting equipment.

Question 1:
What are the issues in this situation?

Question 2:
What would you do to address the situation?

Question 3:
You tried to speak to your friend, but he does not see a need to change his actions. What do you do?

Question 4:
Your friend tells you that he has been stealing to pay off a gambling debt. Does that change the situation?`);

  assert.deepEqual(result, {
    ok: true,
    station: {
      stationTitle: 'Friend stealing at work',
      scenario:
        'You and your friend both started working in a sports store over the summer holidays.\nYou recently noticed that your friend has started stealing shoes and sporting equipment.',
      questions: [
        'What are the issues in this situation?',
        'What would you do to address the situation?',
        'You tried to speak to your friend, but he does not see a need to change his actions. What do you do?',
        'Your friend tells you that he has been stealing to pay off a gambling debt. Does that change the situation?',
      ],
    },
  });
});

test('parses labels case-insensitively and allows an empty scenario', () => {
  const result = parseStructuredStationText(`station title:
A difficult conversation

scenario / context:

question 1:
First question?

QUESTION 2:
Second question?

Question 3:
Third question?

Question 4:
Fourth question?`);

  assert.equal(result.ok, true);
  assert.equal(result.station.stationTitle, 'A difficult conversation');
  assert.equal(result.station.scenario, '');
  assert.deepEqual(result.station.questions, ['First question?', 'Second question?', 'Third question?', 'Fourth question?']);
});

test('reports specific missing required fields without discarding pasted text', () => {
  const input = `Station Title:
Friend stealing at work

Scenario / Context:
Some context

Question 1:
First question?

Question 2:
Second question?

Question 4:
Fourth question?`;

  const result = parseStructuredStationText(input);

  assert.deepEqual(result, {
    ok: false,
    message: 'Missing: Question 3',
    missingFields: ['Question 3'],
    originalText: input,
  });
});

test('reports unparsable station text when required labels are absent', () => {
  const input = 'Title: A station\nQ1: What happens?';

  assert.deepEqual(parseStructuredStationText(input), {
    ok: false,
    message:
      'The station text could not be parsed. Please use the required labels: Station Title, Scenario / Context, Question 1, Question 2, Question 3, Question 4.',
    missingFields: ['Station Title', 'Question 1', 'Question 2', 'Question 3', 'Question 4'],
    originalText: input,
  });
});
