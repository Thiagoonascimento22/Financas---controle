const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

router.use(auth);

router.post('/analyze', async (req, res) => {
  try {
    const { context } = req.body;
    if (!context) return res.status(400).json({ error: 'Contexto não fornecido.' });

    if (!process.env.ANTHROPIC_API_KEY)
      return res.status(503).json({ error: 'Chave de IA não configurada no servidor.' });

    const systemPrompt = `Você é um consultor financeiro pessoal brasileiro, direto e prático.
Analise os dados financeiros do usuário e forneça um relatório completo em HTML com:
1. Diagnóstico geral (2-3 frases sobre a saúde financeira do mês)
2. Pontos de atenção (gastos elevados, categorias que merecem cuidado)
3. 5 sugestões práticas de economia numeradas e específicas
4. 3 metas para o próximo mês com valores concretos
5. Nota de saúde financeira de 0 a 10 com justificativa
Use <strong> para destacar valores. Use <br><br> entre seções.
IMPORTANTE: Retorne APENAS o HTML puro, sem markdown, sem backticks, sem bloco de código.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: 'user', content: context }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Erro na API de IA.' });

    let text = data.content?.[0]?.text || 'Sem resposta.';
    text = text.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao processar análise.' });
  }
});

module.exports = router;
