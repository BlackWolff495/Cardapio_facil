const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = process.env.ANTHROPIC_API_KEY;
const DB_FILE = path.join(__dirname, "data", "assinantes.json");

// ===== Banco de dados simples em arquivo JSON =====
function garantirArquivoDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");
}

function lerAssinantes() {
  garantirArquivoDB();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function salvarAssinantes(dados) {
  garantirArquivoDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(dados, null, 2));
}

function normalizarEmail(email) {
  return (email || "").trim().toLowerCase();
}

// ===== Webhook da Fruitfy =====
// Configure essa URL no painel: Integrações > Webhooks
// URL: https://SEU-APP.onrender.com/webhook/fruitfy
app.post("/webhook/fruitfy", (req, res) => {
  try {
    const payload = req.body;
    console.log("Webhook recebido:", payload.event);

    if (payload.event !== "order_paid") {
      // Ignora outros eventos (aguardando pagamento, cancelado, etc)
      return res.status(200).json({ ok: true, ignorado: payload.event });
    }

    const email = normalizarEmail(payload?.order?.customer?.email);
    const orderId = payload?.order?.id;

    if (!email) {
      console.error("Webhook sem e-mail do cliente");
      return res.status(400).json({ erro: "E-mail do cliente não encontrado no payload" });
    }

    const assinantes = lerAssinantes();

    // Idempotência: se esse pedido já foi processado, não duplica o acesso
    const jaProcessado = assinantes[email] && assinantes[email].ultimoOrderId === orderId;
    if (jaProcessado) {
      return res.status(200).json({ ok: true, duplicado: true });
    }

    const agora = new Date();
    const expira = new Date(agora);
    expira.setDate(expira.getDate() + 30); // acesso válido por 30 dias

    assinantes[email] = {
      ativoDesde: agora.toISOString(),
      expiraEm: expira.toISOString(),
      ultimoOrderId: orderId,
      nome: payload?.order?.customer?.name || ""
    };

    salvarAssinantes(assinantes);
    console.log(`Acesso liberado para ${email} até ${expira.toISOString()}`);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook:", err);
    res.status(500).json({ erro: "Falha ao processar webhook" });
  }
});

// ===== Checagem de acesso (o app chama isso no login) =====
app.post("/api/checar-acesso", (req, res) => {
  const email = normalizarEmail(req.body.email);
  if (!email) return res.status(400).json({ erro: "E-mail é obrigatório" });

  const assinantes = lerAssinantes();
  const registro = assinantes[email];

  if (!registro) {
    return res.json({ acesso: false, motivo: "nao_encontrado" });
  }

  const expirou = new Date(registro.expiraEm) < new Date();

  if (expirou) {
    return res.json({ acesso: false, motivo: "expirado", expiraEm: registro.expiraEm });
  }

  res.json({ acesso: true, expiraEm: registro.expiraEm });
});

// ===== Geração de cardápio (agora exige e-mail com acesso válido) =====
app.post("/api/gerar-cardapio", async (req, res) => {
  const email = normalizarEmail(req.body.email);
  if (!email) {
    return res.status(401).json({ erro: "E-mail é obrigatório." });
  }

  const assinantes = lerAssinantes();
  const registro = assinantes[email];
  const temAcesso = registro && new Date(registro.expiraEm) >= new Date();

  if (!temAcesso) {
    return res.status(403).json({ erro: "Acesso expirado ou não encontrado. Assine para continuar." });
  }

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
    } catch {
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
