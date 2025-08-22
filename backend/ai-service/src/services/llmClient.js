const logger = require('../logger');

async function callChatLLM({ system, user, temperature = 0.3, model = process.env.OPENAI_MODEL || 'gpt-4o-mini' }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY manquant: fallback local');
    return { text: null };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: user },
      ],
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`LLM HTTP ${response.status}: ${msg}`);
  }
  const json = await response.json();
  const text = json?.choices?.[0]?.message?.content || '';
  return { text };
}

module.exports = { callChatLLM };


