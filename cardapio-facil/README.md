# 🍽️ Cardápio Fácil

Gerador de cardápio semanal com IA + lista de compras automática.
Backend seguro que protege sua chave de API.

---

## 📁 Estrutura

```
cardapio-facil/
├── server.js          → backend (guarda sua chave, chama a IA)
├── package.json       → dependências
├── .env.example       → modelo de onde sua chave vai
├── .gitignore         → protege a chave de vazar no GitHub
└── public/
    └── index.html     → o app (frontend)
```

---

## ✅ Por que precisa de backend?

A chave de API é um segredo. Se ela ficasse no `index.html`, qualquer pessoa
poderia abrir o código-fonte da página, copiar sua chave e gastar seu crédito.
O backend resolve isso: a chave fica só no servidor, o navegador nunca a vê.

---

## 🔑 Passo 1 — Pegue sua chave de API

1. Acesse https://console.anthropic.com
2. Crie sua conta e adicione créditos (você paga só pelo uso)
3. Vá em **API Keys** → **Create Key** e copie a chave (começa com `sk-ant-...`)

> ⚠️ Guarde essa chave. Você NUNCA a coloca no código — só nas variáveis
> de ambiente do servidor (passo 3).

---

## 💻 Passo 2 — Testar no seu computador (opcional)

Precisa do Node.js 18+ instalado.

```bash
cd cardapio-facil
npm install

# Crie um arquivo .env (copie do .env.example) e cole sua chave nele:
#   ANTHROPIC_API_KEY=sk-ant-sua-chave

# Rode:
node server.js
```

Abra http://localhost:3000 no navegador. Deve gerar cardápios de verdade.

> Para o .env funcionar localmente, instale também: `npm install dotenv`
> e adicione `require("dotenv").config();` na primeira linha do server.js.
> No deploy (passo 3) isso não é necessário.

---

## 🚀 Passo 3 — Publicar online (Render — gratuito e simples)

1. Crie uma conta em https://render.com
2. Suba este projeto para um repositório no GitHub
   (o `.gitignore` já impede sua chave de vazar)
3. No Render: **New** → **Web Service** → conecte seu repositório
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Em **Environment** → **Add Environment Variable**:
   - Key: `ANTHROPIC_API_KEY`
   - Value: sua chave `sk-ant-...`
6. Clique em **Deploy**

Em poucos minutos você recebe uma URL pública (ex: `cardapio-facil.onrender.com`).
É essa URL que você vai divulgar e vender.

> Alternativas ao Render: Railway, Fly.io ou Vercel (todas funcionam de forma
> parecida — o importante é configurar a variável de ambiente ANTHROPIC_API_KEY).

---

## 💳 Passo 4 — Conectar a Pagap (cobrança)

1. Na Pagap, crie um produto de **assinatura mensal** (ex: R$ 19,90/mês)
2. Copie o **link de checkout** que a Pagap gerar
3. No arquivo `public/index.html`, procure pela função `assinar()` e troque
   o `alert(...)` por:
   ```js
   function assinar() {
     window.location.href = "COLE-SEU-LINK-DA-PAGAP-AQUI";
   }
   ```

> 💡 Para liberar o app só para quem pagou, o ideal é, no futuro, a Pagap
> avisar seu servidor quando alguém assina (webhook) e você gerar um login/senha.
> Para começar e validar a ideia, você pode primeiro vender o acesso manualmente
> e ir evoluindo.

---

## 💰 Custos por geração (referência)

O modelo usado (claude-sonnet-4-6) custa cerca de US$ 3 por milhão de tokens
de entrada e US$ 15 de saída. Cada cardápio gasta poucos milhares de tokens —
ou seja, cada geração custa centavos. Com a assinatura a R$ 19,90/mês,
a margem é altíssima.

---

## 🎯 Resumo

Você cuida de: criar a conta na Anthropic, colocar a chave no servidor,
publicar e configurar a Pagap.
O código cuida do resto.
