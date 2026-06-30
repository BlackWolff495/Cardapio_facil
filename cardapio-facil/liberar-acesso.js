// Script para liberar acesso manualmente (uso via Shell do Render)
// Uso: node liberar-acesso.js seuemail@exemplo.com [dias]

const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "data", "assinantes.json");

const email = (process.argv[2] || "").trim().toLowerCase();
const dias = parseInt(process.argv[3] || "30", 10);

if (!email || !email.includes("@")) {
  console.error("Uso: node liberar-acesso.js seuemail@exemplo.com [dias]");
  process.exit(1);
}

const dir = path.dirname(DB_FILE);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "{}");

const assinantes = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));

const agora = new Date();
const expira = new Date(agora);
expira.setDate(expira.getDate() + dias);

assinantes[email] = {
  ativoDesde: agora.toISOString(),
  expiraEm: expira.toISOString(),
  ultimoOrderId: "liberado-manualmente",
  nome: "Teste manual"
};

fs.writeFileSync(DB_FILE, JSON.stringify(assinantes, null, 2));

console.log(`✅ Acesso liberado para ${email}`);
console.log(`   Válido até: ${expira.toISOString()}`);
