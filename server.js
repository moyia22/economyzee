import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Servir os arquivos estáticos da pasta de build (dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Redirecionar todas as outras rotas para o index.html (SPA fallback)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`DisCloud Frontend Web Server rodando na porta ${PORT}`);
});
