// ============================================
//  Cardápio Fácil — Backend seguro
//  A sua chave de API fica SÓ aqui no servidor,
//  nunca chega ao navegador do cliente.
// ============================================

const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());

// Serve o app (frontend) da pasta /public
app.use(express.static(path.join(__dirname, "public")));

// Pega a chave da variável de ambiente (você configura no deploy)
const API_KEY = process.env.ANTHROPIC_API_KEY;

// Rota que o app chama para gerar o cardápio
app.post("/api/gerar-cardapio", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      erro: "Chave de API não configurada no servidor. Defina ANTHROPIC_API_KEY."
    });
  }

  const prefs = req.body;

  const prompt = `Você é um nutricionista brasileiro especialista em planejamento alimentar prático e saboroso.

Crie um cardápio semanal COMPLETO (segunda a domingo) com base nas preferências:
- Pessoas: ${prefs.pessoas}
- Objetivo: ${prefs.objetivo}
- Orçamento: ${prefs.orcamento}
- Restrições: ${prefs.restricoes && prefs.restricoes.length ? prefs.restricoes.join(", ") : "Nenhuma"}
- Não come: ${prefs.naoCome || "nada especificado"}

Responda APENAS com JSON válido, sem texto extra, sem markdown, sem backticks. Formato:
{
  "dias": [
    {
      "dia": "Segunda-feira",
      "icone": "🌅",
      "cafe": "descrição do café da manhã",
      "almoco": "descrição do almoço",
      "jantar": "descrição do jantar"
    }
  ],
  "lista": {
    "Hortifrúti": [ {"nome": "Tomate", "quantidade": "6 unidades"} ],
    "Proteínas": [],
    "Grãos e carboidratos": [],
    "Laticínios": [],
    "Outros": []
  }
}

Use ingredientes acessíveis no Brasil. Seja específico nas quantidades da lista de compras para ${prefs.pessoas} pessoas por 7 dias. Inclua no mínimo 4 itens por categoria na lista.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const detalhe = await response.text();
      console.error("Erro da Anthropic:", detalhe);
      return res.status(502).json({ erro: "Erro ao chamar a IA.", detalhe });
    }

    const data = await response.json();
    const texto = data.content.map(i => i.text || "").join("");
    const clean = texto.replace(/```json|```/g, "").trim();
    const resultado = JSON.parse(clean);

    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao gerar o cardápio.", detalhe: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cardápio Fácil rodando na porta ${PORT}`);
});
