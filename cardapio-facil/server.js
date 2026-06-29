const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.ANTHROPIC_API_KEY;

app.post("/api/gerar-cardapio", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ erro: "Chave de API não configurada. Defina ANTHROPIC_API_KEY." });
  }

  const prefs = req.body;

  const prompt = `Você é um nutricionista brasileiro. Crie um cardápio semanal (seg a dom) para ${prefs.pessoas} pessoas. Objetivo: ${prefs.objetivo}. Orçamento: ${prefs.orcamento}. Restrições: ${prefs.restricoes && prefs.restricoes.length ? prefs.restricoes.join(", ") : "nenhuma"}. Não come: ${prefs.naoCome || "nada"}.

REGRAS OBRIGATÓRIAS:
1. Responda SOMENTE com JSON puro, sem texto antes ou depois, sem markdown, sem backticks
2. Descrições CURTAS, máximo 80 caracteres cada
3. Exatamente 7 dias, exatamente 5 categorias na lista com mínimo 4 itens cada

Formato exato:
{"dias":[{"dia":"Segunda-feira","icone":"🌅","cafe":"...","almoco":"...","jantar":"..."},{"dia":"Terça-feira","icone":"🌞","cafe":"...","almoco":"...","jantar":"..."},{"dia":"Quarta-feira","icone":"🌿","cafe":"...","almoco":"...","jantar":"..."},{"dia":"Quinta-feira","icone":"⚡","cafe":"...","almoco":"...","jantar":"..."},{"dia":"Sexta-feira","icone":"🎉","cafe":"...","almoco":"...","jantar":"..."},{"dia":"Sábado","icone":"🌊","cafe":"...","almoco":"...","jantar":"..."},{"dia":"Domingo","icone":"☀️","cafe":"...","almoco":"...","jantar":"..."}],"lista":{"Hortifrúti":[{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."}],"Proteínas":[{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."}],"Grãos e carboidratos":[{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."}],"Laticínios":[{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."}],"Outros":[{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."},{"nome":"...","quantidade":"..."}]}}`;

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
        max_tokens: 4000,
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

    let resultado;
    try {
      resultado = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON inválido recebido da IA:", clean.substring(0, 300));
      return res.status(500).json({ erro: "A IA retornou um formato inválido. Tente novamente." });
    }

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
