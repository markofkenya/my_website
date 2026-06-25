import type { Question } from './types';

export async function generateQuestions(
  apiKey: string,
  pdfB64: string,
  numQ: number,
  onStatus: (title: string, sub: string) => void
): Promise<Question[]> {
  const prompt =
`You are writing exam questions for a medical professional preparing for the UK Specialty Certificate Examination (SCE) in Nephrology.

Generate exactly ${numQ} best-of-five MCQs from the clinical content in the attached PDF. Follow SCE exam style:
- Clinical stem (2–4 sentences): patient demographics, complaint, history, relevant examination/investigation findings
- Five options A–E — all plausible; avoid obviously wrong distractors
- One correct answer
- Concise explanation (2–3 sentences): why the correct answer is right and why the main distractors are not

Return ONLY a valid JSON object — no markdown, no preamble, no trailing text:
{"questions":[{"id":1,"stem":"...","options":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correct":"B","explanation":"..."}]}`;

  onStatus('Sending PDF to Claude…', 'This may take 30–60 seconds for large PDFs');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-allow-browser': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-8',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB64 } },
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`API ${res.status}: ${(body as { error?: { message?: string } })?.error?.message ?? res.statusText}`);
  }

  onStatus('Parsing questions…', '');

  const data = await res.json();
  const raw: string = data.content?.[0]?.text ?? '';

  let parsed: { questions: Question[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("No JSON found in Claude's response.\n\nFirst 600 chars:\n" + raw.slice(0, 600));
    parsed = JSON.parse(m[0]);
  }

  if (!Array.isArray(parsed?.questions) || !parsed.questions.length) {
    throw new Error('Unexpected JSON structure — expected { questions: [...] }');
  }

  return parsed.questions;
}
