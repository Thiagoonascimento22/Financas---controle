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
Analise APENAS os dados do mês atual fornecidos.

REGRAS:
- Analise SOMENTE o mês atual. NÃO mencione meses anteriores ou sem dados.
- Responda em texto simples com HTML básico apenas para formatação inline.

Estruture assim (use esses títulos exatos):

<h3>📊 Diagnóstico Geral</h3>
2-3 frases sobre a saúde financeira do mês atual.

<h3>⚠️ Pontos de Atenção</h3>
Lista com os principais alertas baseados nos gastos deste mês.

<h3>💡 5 Sugestões Práticas</h3>
Lista numerada de 5 dicas específicas para os gastos registrados.

<h3>🎯 3 Metas para o Próximo Mês</h3>
Lista com 3 metas concretas com valores baseados nos dados.

<h3>❤️ Nota de Saúde Financeira</h3>
Nota de 0 a 10 com justificativa de 2 linhas.

Use <strong> para valores em reais. NÃO use DOCTYPE, html, head, body, style ou qualquer tag estrutural. Apenas o conteúdo direto.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
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
