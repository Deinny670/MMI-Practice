export const MODULES = [
  {
    name: 'Motivation / Course Fit',
    slug: 'motivation-course-fit',
    description: 'Clarify why medicine, why this course, and readiness for the path.',
  },
  {
    name: 'Communication / Rapport',
    slug: 'communication-rapport',
    description: 'Practise clear, empathetic communication.',
  },
  {
    name: 'Professional Behaviour',
    slug: 'professional-behaviour',
    description: 'Practise boundaries, respect, integrity, and responsibility.',
  },
  {
    name: 'Ethics / Decision-Making',
    slug: 'ethics-decision-making',
    description: 'Practise balanced reasoning in difficult situations.',
  },
  {
    name: 'Teamwork / Collaboration',
    slug: 'teamwork-collaboration',
    description: 'Practise working with peers, conflict, and shared responsibility.',
  },
  {
    name: 'Reflection / Feedback',
    slug: 'reflection-feedback',
    description: 'Practise self-awareness, feedback, failure, and growth.',
  },
  {
    name: 'Public Health / Social Awareness',
    slug: 'public-health-social-awareness',
    description: 'Practise population-level thinking and health equity.',
  },
  {
    name: 'De-technicalisation',
    slug: 'de-technicalisation',
    description: 'Practise explaining complex ideas simply.',
  },
  {
    name: 'Cultural Safety / Equity',
    slug: 'cultural-safety-equity',
    description: 'Practise respectful care across cultures and unequal systems.',
  },
];

export const TIMING = {
  scenarioReadSeconds: 30,
  questionPrepSeconds: 15,
  answerSeconds: 60,
  questionCount: 4,
};

export const REFLECTION_PROMPTS = {
  summary: 'Briefly summarize how you approached this station.',
  answerReview: 'What did I do well, and what would I change if I answered again?',
  structureCheck: 'Did I show structure, empathy, professionalism, and a clear next step?',
  nextStep: 'What is one specific thing I should practise or improve in the next station?',
};

export const REFLECTION_AUDIO_FILES = {
  summary: 'reflection-01-summary.webm',
  answerReview: 'reflection-02-answer-review.webm',
  structureCheck: 'reflection-03-structure-empathy-professionalism-next-step.webm',
  nextStep: 'reflection-04-next-station-improvement.webm',
};

export const STATION_TEXT_TEMPLATE = `Station Title:

Scenario / Context:

Question 1:

Question 2:

Question 3:

Question 4:`;

const STATION_LABELS = [
  { key: 'stationTitle', label: 'Station Title', pattern: /^station title:\s*$/i, required: true },
  { key: 'scenario', label: 'Scenario / Context', pattern: /^scenario\s*\/\s*context:\s*$/i, required: false },
  { key: 'question1', label: 'Question 1', pattern: /^question 1:\s*$/i, required: true },
  { key: 'question2', label: 'Question 2', pattern: /^question 2:\s*$/i, required: true },
  { key: 'question3', label: 'Question 3', pattern: /^question 3:\s*$/i, required: true },
  { key: 'question4', label: 'Question 4', pattern: /^question 4:\s*$/i, required: true },
];

const PARSE_ERROR_MESSAGE =
  'The station text could not be parsed. Please use the required labels: Station Title, Scenario / Context, Question 1, Question 2, Question 3, Question 4.';

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function createSessionId({ createdAt = new Date(), moduleSlug, stationTitle = '', timeZone } = {}) {
  const dateTime = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(createdAt)
    .reduce((parts, part) => ({ ...parts, [part.type]: part.value }), {});

  const base = `${dateTime.year}-${dateTime.month}-${dateTime.day}_${dateTime.hour}-${dateTime.minute}_${moduleSlug}`;
  const titleSlug = slugify(stationTitle);
  return titleSlug ? `${base}_${titleSlug}` : base;
}

export function createQuestionText({ module, stationTitle = '', scenario = '', questions }) {
  return [
    `Module: ${module}`,
    `Station Title: ${stationTitle}`,
    '',
    'Scenario:',
    scenario,
    '',
    'Question 1:',
    questions[0] ?? '',
    '',
    'Question 2:',
    questions[1] ?? '',
    '',
    'Question 3:',
    questions[2] ?? '',
    '',
    'Question 4:',
    questions[3] ?? '',
    '',
  ].join('\n');
}

export function parseStructuredStationText(text) {
  const originalText = String(text ?? '');
  const parsed = {};
  let currentKey = null;
  let sawRecognizedLabel = false;

  for (const line of originalText.split(/\r?\n/)) {
    const label = STATION_LABELS.find((candidate) => candidate.pattern.test(line.trim()));
    if (label) {
      currentKey = label.key;
      parsed[currentKey] = [];
      sawRecognizedLabel = true;
      continue;
    }

    if (currentKey) {
      parsed[currentKey].push(line);
    }
  }

  const values = Object.fromEntries(
    STATION_LABELS.map((label) => [label.key, (parsed[label.key] ?? []).join('\n').trim()]),
  );
  const missingFields = STATION_LABELS.filter((label) => label.required && !values[label.key]).map((label) => label.label);

  if (missingFields.length > 0) {
    return {
      ok: false,
      message: sawRecognizedLabel ? `Missing: ${missingFields.join(', ')}` : PARSE_ERROR_MESSAGE,
      missingFields,
      originalText,
    };
  }

  return {
    ok: true,
    station: {
      stationTitle: values.stationTitle,
      scenario: values.scenario,
      questions: [values.question1, values.question2, values.question3, values.question4],
    },
  };
}

export function createReflectionMarkdown({ responses = {} } = {}) {
  return [
    '# Reflection',
    '',
    `## ${REFLECTION_PROMPTS.summary}`,
    '',
    responses.summary ?? '',
    '',
    `## ${REFLECTION_PROMPTS.answerReview}`,
    '',
    responses.answerReview ?? '',
    '',
    `## ${REFLECTION_PROMPTS.structureCheck}`,
    '',
    responses.structureCheck ?? '',
    '',
    `## ${REFLECTION_PROMPTS.nextStep}`,
    '',
    responses.nextStep ?? '',
    '',
  ].join('\n');
}

export function buildAudioSegments() {
  return Array.from({ length: TIMING.questionCount }, (_, index) => {
    const startSeconds = index * (TIMING.questionPrepSeconds + TIMING.answerSeconds);
    return [`q${index + 1}`, { startSeconds, endSeconds: startSeconds + TIMING.answerSeconds }];
  }).reduce((segments, [key, value]) => ({ ...segments, [key]: value }), {});
}

export function buildMetadata({ sessionId, createdAtIso, module, stationTitle = '', reflectionAudioFiles = {} }) {
  const files = {
    question: 'question.txt',
    audio: 'answer.webm',
    reflection: 'reflection.md',
  };

  if (Object.keys(reflectionAudioFiles).length > 0) {
    files.reflectionAudio = reflectionAudioFiles;
  }

  return {
    sessionId,
    createdAt: createdAtIso,
    module,
    stationTitle,
    timing: { ...TIMING },
    files,
    audioSegments: buildAudioSegments(),
  };
}

export function getPhaseSequence() {
  return [
    {
      id: 'scenario_reading',
      label: 'Scenario reading',
      durationSeconds: TIMING.scenarioReadSeconds,
      recording: false,
    },
    ...Array.from({ length: TIMING.questionCount }, (_, index) => {
      const questionNumber = index + 1;
      return [
        {
          id: `q${questionNumber}_prep`,
          label: `Question ${questionNumber} preparation`,
          questionNumber,
          durationSeconds: TIMING.questionPrepSeconds,
          recording: false,
        },
        {
          id: `q${questionNumber}_answer`,
          label: `Question ${questionNumber} answer`,
          questionNumber,
          durationSeconds: TIMING.answerSeconds,
          recording: true,
        },
      ];
    }).flat(),
    {
      id: 'complete',
      label: 'Station complete',
      durationSeconds: 0,
      recording: false,
    },
  ];
}

export function hasRequiredSetupInputs({ station, hasSaveFolder, hasMicrophoneSupport }) {
  const questions = station?.questions ?? [];
  return Boolean(
    hasSaveFolder &&
      hasMicrophoneSupport &&
      questions.length === TIMING.questionCount &&
      questions.every((question) => String(question).trim().length > 0),
  );
}

export function supportsRequiredBrowserApis(globalLike = globalThis) {
  return Boolean(
    globalLike.showDirectoryPicker &&
      globalLike.navigator?.mediaDevices?.getUserMedia &&
      globalLike.MediaRecorder,
  );
}
