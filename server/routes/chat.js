const express = require('express');
const router = express.Router();
const SCENARIOS = require('../prompts/scenarios');

async function callOpenRouter(systemPrompt, messages) {
  const openRouterMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4',
      max_tokens: 1024,
      messages: openRouterMessages
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

router.post('/message', async (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });

  const { scenario, messages } = req.body;

  if (!SCENARIOS[scenario]) {
    return res.status(400).json({ error: 'Invalid scenario' });
  }

  try {
    const reply = await callOpenRouter(SCENARIOS[scenario].systemPrompt, messages);
    res.json({ reply });
  } catch (err) {
    console.error('OpenRouter error:', err);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

router.get('/scenarios', (req, res) => {
  if (!req.session.authenticated) return res.status(401).json({ error: 'Unauthorized' });

  const list = Object.entries(SCENARIOS).map(([key, val]) => ({
    id: key,
    label: val.label,
    icon: val.icon,
    description: val.description
  }));
  res.json(list);
});

module.exports = router;
