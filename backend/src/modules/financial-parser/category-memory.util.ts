/**
 * Extrai o "token principal" de um lançamento em texto livre, para ser usado
 * como chave da memória de categorização por usuário.
 *
 * Ex.: "gasto de 110 com o claude" -> "claude"
 */

const STOPWORDS = new Set([
  'de', 'com', 'no', 'na', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'pra', 'para', 'em', 'do', 'da', 'dos', 'das', 'ao', 'aos',
  'reais', 'real', 'conto', 'contos', 'rs',
  'pix', 'dinheiro', 'especie', 'cartao', 'credito', 'debito', 'via',
  'gastei', 'gasto', 'gastar', 'gastando', 'paguei', 'pagar', 'pago', 'pagamento',
  'comprei', 'comprar', 'compra', 'valor', 'foi', 'era', 'que', 'meu', 'minha',
]);

export function extractMemoryToken(rawText: string | undefined | null): string | null {
  if (!rawText) return null;

  // Usa apenas a primeira linha — ignora sufixos "\nCorrecao: ..." anexados.
  const firstLine = rawText.split('\n')[0];

  const normalized = firstLine
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/r\$/g, ' ')            // remove símbolo de moeda
    .replace(/\d+([.,]\d+)?/g, ' ')  // remove números
    .replace(/[^a-z\s]/g, ' ')       // remove pontuação/símbolos
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = normalized
    .split(' ')
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));

  if (tokens.length === 0) return null;

  // Token principal: o mais longo; empate -> o último na frase (>= faz o último vencer).
  let best = tokens[0];
  for (const t of tokens) {
    if (t.length >= best.length) best = t;
  }
  return best;
}
