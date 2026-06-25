import { useState } from 'react';
import { generateQuestions } from './api';
import type { Screen, Question, Answer, AnswerLetter } from './types';

const COUNTS = [5, 10, 15, 20] as const;
const LETTERS: AnswerLetter[] = ['A', 'B', 'C', 'D', 'E'];

export default function App() {
  const [screen, setScreen]         = useState<Screen>('setup');
  const [apiKey, setApiKey]         = useState(() => sessionStorage.getItem('sce-key') ?? '');
  const [pdfB64, setPdfB64]         = useState('');
  const [pdfName, setPdfName]       = useState('');
  const [numQ, setNumQ]             = useState(10);
  const [sliderVal, setSliderVal]   = useState(1);
  const [questions, setQuestions]   = useState<Question[]>([]);
  const [idx, setIdx]               = useState(0);
  const [answers, setAnswers]       = useState<Answer[]>([]);
  const [answered, setAnswered]     = useState(false);
  const [lastChosen, setLastChosen] = useState<AnswerLetter | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const [fileErr, setFileErr]       = useState('');
  const [setupErr, setSetupErr]     = useState('');
  const [loadTitle, setLoadTitle]   = useState('');
  const [loadSub, setLoadSub]       = useState('');

  // ─── Handlers ──────────────────────────────────────────

  function handleApiKey(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.trim();
    setApiKey(val);
    sessionStorage.setItem('sce-key', val);
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Number(e.target.value);
    setSliderVal(v);
    setNumQ(COUNTS[v]);
  }

  function handleFile(f: File) {
    setFileErr('');
    if (f.type !== 'application/pdf') { setFileErr('Please select a PDF file.'); return; }
    if (f.size > 30 * 1024 * 1024)
      setFileErr(`File is ${(f.size / 1024 / 1024).toFixed(1)} MB — the Anthropic API limit is ~32 MB. Try a smaller file.`);
    setPdfName(`📎 ${f.name}  (${(f.size / 1024 / 1024).toFixed(1)} MB)`);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPdfB64(result.split(',')[1]);
    };
    reader.readAsDataURL(f);
  }

  async function handleGenerate() {
    setSetupErr('');
    setScreen('loading');
    try {
      const qs = await generateQuestions(apiKey, pdfB64, numQ, (title, sub) => {
        setLoadTitle(title);
        setLoadSub(sub);
      });
      setQuestions(qs);
      setIdx(0);
      setAnswers([]);
      setAnswered(false);
      setLastChosen(null);
      setScreen('quiz');
    } catch (err) {
      setScreen('setup');
      setSetupErr((err as Error).message);
    }
  }

  function handleAnswer(chosen: AnswerLetter) {
    if (answered) return;
    const q = questions[idx];
    setAnswered(true);
    setLastChosen(chosen);
    setAnswers(prev => [...prev, { chosen, correct: q.correct, ok: chosen === q.correct }]);
  }

  function handleNext() {
    if (idx === questions.length - 1) {
      setScreen('results');
    } else {
      setIdx(i => i + 1);
      setAnswered(false);
      setLastChosen(null);
    }
  }

  function handleRetake() {
    setPdfB64('');
    setPdfName('');
    setQuestions([]);
    setAnswers([]);
    setIdx(0);
    setAnswered(false);
    setLastChosen(null);
    setFileErr('');
    setSetupErr('');
    setScreen('setup');
  }

  // ─── Option button styles ───────────────────────────────

  function optionClasses(ltr: AnswerLetter): string {
    const base =
      'flex items-start gap-3 w-full rounded-md border px-4 py-3 text-left text-sm leading-relaxed transition-colors ';
    if (!answered)
      return base + 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-700 cursor-pointer';
    if (ltr === questions[idx].correct)
      return base + 'border-green-500 bg-green-950/40 text-zinc-200 cursor-default';
    if (ltr === lastChosen)
      return base + 'border-red-500 bg-red-950/40 text-zinc-200 cursor-default';
    return base + 'border-zinc-700 bg-zinc-800 text-zinc-400 cursor-default opacity-60';
  }

  function letterClasses(ltr: AnswerLetter): string {
    const base = 'shrink-0 font-bold text-xs pt-0.5 w-4 ';
    if (!answered) return base + 'text-zinc-400';
    if (ltr === questions[idx].correct) return base + 'text-green-400';
    if (ltr === lastChosen) return base + 'text-red-400';
    return base + 'text-zinc-600';
  }

  // ─── Results data ───────────────────────────────────────

  const right = answers.filter(a => a.ok).length;
  const total = answers.length;
  const pct   = total > 0 ? Math.round((right / total) * 100) : 0;
  const wrong = answers.map((a, i) => ({ ...a, q: questions[i] })).filter(a => !a.ok);

  let scoreColor = 'text-red-400';
  let badgeCls   = 'border-red-700 bg-red-950/40 text-red-400';
  let badgeLabel = 'FAIL';
  if (pct >= 70) {
    scoreColor = 'text-green-400'; badgeCls = 'border-green-700 bg-green-950/40 text-green-400'; badgeLabel = 'PASS';
  } else if (pct >= 60) {
    scoreColor = 'text-amber-400'; badgeCls = 'border-amber-700 bg-amber-950/40 text-amber-400'; badgeLabel = 'BORDERLINE';
  }

  const q        = questions[idx];
  const progress = questions.length > 0 ? Math.round((idx / questions.length) * 100) : 0;
  const lastAnswer = answers[answers.length - 1];

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 pb-20">

      {/* ════════ SETUP ════════ */}
      {screen === 'setup' && (
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight">SCE Quiz Generator</h1>
            <p className="text-sm text-zinc-400 mt-2">
              Upload a nephrology PDF · Claude generates best-of-five MCQs
            </p>
          </div>

          {/* API key */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 mb-3">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Anthropic API Key</label>
            <input
              type="password" value={apiKey} onChange={handleApiKey}
              autoComplete="off" spellCheck={false} placeholder="sk-ant-…"
              className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950
                         px-3 py-2 text-sm placeholder:text-zinc-600
                         focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-600 mt-2">Stays in session memory — only sent to the Anthropic API</p>
          </div>

          {/* PDF upload */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 mb-3">
            <label className="block text-sm font-medium text-zinc-300 mb-2">Upload PDF</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
              }}
              className={`relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-zinc-400 bg-zinc-800/60'
                  : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40'}`}
            >
              <input
                type="file" accept=".pdf,application/pdf"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="text-3xl opacity-40 mb-3">📄</div>
              <p className="text-sm font-medium text-zinc-300">Drop PDF here or click to browse</p>
              <p className="text-xs text-zinc-600 mt-1">~20 MB max recommended</p>
              {pdfName && <p className="text-xs font-semibold text-sky-400 mt-2">{pdfName}</p>}
            </div>
            {fileErr && <p className="text-xs text-red-400 mt-2 leading-relaxed">{fileErr}</p>}
          </div>

          {/* Question count */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 mb-5">
            <label className="block text-sm font-medium text-zinc-300 mb-3">Number of Questions</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min="0" max="3" step="1" value={sliderVal}
                onChange={handleSlider}
                className="flex-1"
              />
              <span className="text-xl font-bold text-zinc-100 tabular-nums w-7 text-right">{numQ}</span>
            </div>
            <div className="flex justify-between mt-2 px-0.5">
              {COUNTS.map(n => <span key={n} className="text-xs text-zinc-600">{n}</span>)}
            </div>
          </div>

          {setupErr && (
            <p className="text-xs text-red-400 mb-3 leading-relaxed whitespace-pre-wrap break-words">{setupErr}</p>
          )}

          <button
            onClick={handleGenerate} disabled={!apiKey || !pdfB64}
            className="inline-flex items-center justify-center w-full h-11 rounded-md
                       bg-zinc-100 text-zinc-900 text-sm font-semibold
                       hover:bg-white transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Generate Quiz
          </button>
        </div>
      )}

      {/* ════════ LOADING ════════ */}
      {screen === 'loading' && (
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center py-28 text-center">
            <div className="spin w-11 h-11 rounded-full border-2 border-zinc-700 border-t-zinc-200 mb-6" />
            <p className="text-base font-semibold">{loadTitle}</p>
            <p className="text-sm text-zinc-400 mt-1">{loadSub}</p>
          </div>
        </div>
      )}

      {/* ════════ QUIZ ════════ */}
      {screen === 'quiz' && q && (
        <div className="w-full max-w-lg">
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span>Question {idx + 1} of {questions.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mb-6">
            <div
              className="h-full bg-zinc-200 rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-sm leading-relaxed text-zinc-100 mb-5">{q.stem}</p>

            <div className="flex flex-col gap-2 mb-4">
              {LETTERS.map(ltr => (
                <button
                  key={ltr}
                  onClick={() => handleAnswer(ltr)}
                  disabled={answered}
                  className={optionClasses(ltr)}
                >
                  <span className={letterClasses(ltr)}>{ltr}</span>
                  <span>{q.options[ltr]}</span>
                </button>
              ))}
            </div>

            {answered && lastAnswer && (
              <div className={`fade-up rounded-md border px-4 py-3 mb-4
                ${lastAnswer.ok ? 'border-green-800 bg-green-950/30' : 'border-red-800 bg-red-950/30'}`}
              >
                <p className={`text-sm font-semibold mb-0.5 ${lastAnswer.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {lastAnswer.ok ? '✓  Correct' : `✗  Incorrect — correct answer: ${q.correct}`}
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {answered && (
              <button
                onClick={handleNext}
                className="inline-flex items-center justify-center w-full h-10 rounded-md
                           bg-zinc-100 text-zinc-900 text-sm font-semibold
                           hover:bg-white transition-colors"
              >
                {idx === questions.length - 1 ? 'View Results →' : 'Next Question →'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ════════ RESULTS ════════ */}
      {screen === 'results' && (
        <div className="w-full max-w-lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">Results</h1>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center mb-5">
            <div className={`text-7xl font-extrabold tracking-tight leading-none mb-2 ${scoreColor}`}>
              {pct}%
            </div>
            <p className="text-sm text-zinc-400 mb-4">{right} correct out of {total}</p>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold tracking-widest uppercase ${badgeCls}`}>
              {badgeLabel}
            </span>
          </div>

          {wrong.length === 0 ? (
            <p className="text-center text-green-400 font-medium py-6">
              Perfect score — nothing to review!
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm font-semibold text-zinc-300 whitespace-nowrap">
                  Questions to Review ({wrong.length})
                </h2>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
              {wrong.map(({ q: wq, chosen, correct }, i) => (
                <div key={i} className="rounded-md border border-zinc-800 bg-zinc-900 p-4 mb-3">
                  <p className="text-sm leading-relaxed text-zinc-300 mb-3">{wq.stem}</p>
                  <p className="text-xs text-red-400 mb-1">
                    <span className="font-semibold">Your answer:</span>{' '}
                    {chosen}. {wq.options[chosen]}
                  </p>
                  <p className="text-xs text-green-400 mb-3">
                    <span className="font-semibold">Correct answer:</span>{' '}
                    {correct}. {wq.options[correct]}
                  </p>
                  <div className="rounded bg-zinc-800 px-3 py-2 text-xs text-zinc-400 leading-relaxed">
                    {wq.explanation}
                  </div>
                </div>
              ))}
            </>
          )}

          <button
            onClick={handleRetake}
            className="mt-4 inline-flex items-center justify-center w-full h-10 rounded-md
                       border border-zinc-700 bg-transparent text-zinc-300 text-sm font-medium
                       hover:bg-zinc-800 transition-colors"
          >
            ← Start Over
          </button>
        </div>
      )}
    </div>
  );
}
