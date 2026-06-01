/**
 * Category Rules — Regras determinísticas de categorização por keyword.
 *
 * Cobertura ampliada: variações coloquiais, nomes de redes,
 * gírias brasileiras e estabelecimentos regionais.
 */

export interface CategoryRule {
  name: string;
  keywords: string[];
  descriptionPrefix?: string;
  type?: 'expense' | 'income';
}

export const CATEGORY_RULES: CategoryRule[] = [
  // ==================== INCOME CATEGORIES (checked first) ====================
  {
    name: 'Salário',
    keywords: ['salario', 'pagamento do trabalho', 'remuneracao', 'holerite', 'pro-labore', 'contracheque'],
    type: 'income',
    descriptionPrefix: 'Recebimento de Salário',
  },
  {
    name: 'Freelance',
    keywords: ['freelance', 'bico', 'trabalho extra', 'servico prestado', 'comissao', 'trampo extra'],
    type: 'income',
    descriptionPrefix: 'Renda de Freelance',
  },
  {
    name: 'Investimento',
    keywords: ['investimento', 'acoes', 'cripto', 'bitcoin', 'tesouro', 'cdb', 'lci', 'lca', 'fundo', 'rendimento', 'dividendo', 'juros recebidos'],
    type: 'income',
    descriptionPrefix: 'Investimento',
  },
  {
    name: 'Venda',
    keywords: [
      'venda', 'vendi', 'recebi de', 'cliente', 'pix recebido',
      'recebi um pix', 'recebi pix', 'recebi via pix',
      'me pagaram', 'depositaram', 'caiu na conta',
      'venda do', 'venda da', 'venda de',
    ],
    type: 'income',
    descriptionPrefix: 'Recebimento',
  },
  {
    name: 'Receita',
    keywords: [
      'recebi', 'ganhei', 'faturei',
      'reembolso', 'restituicao', 'devolucao',
      'bonus', 'premio', 'gratificacao',
      'mesada', 'pensao', 'renda extra', 'renda',
      'aluguel recebido', 'deposito recebido',
    ],
    type: 'income',
    descriptionPrefix: 'Recebimento',
  },
  // ==================== EXPENSE CATEGORIES ====================
  {
    name: 'Saúde',
    keywords: [
      'farmacia', 'remedio', 'medicamento', 'drogaria', 'hospital', 'medico',
      'dentista', 'consulta', 'exame', 'laboratorio', 'clinica', 'ortopedia',
      'oftalmologista', 'terapia', 'psicologica', 'plano de saude',
      'drogasil', 'droga raia', 'panvel', 'pague menos', 'catarinense',
    ],
    descriptionPrefix: 'Saúde',
  },
  {
    name: 'Mercado',
    keywords: [
      'mercado', 'supermercado', 'atacadao', 'assai', 'carrefour', 'extra',
      'pao de acucar', 'big', 'maxxi', 'fort', 'condor', 'angeloni',
      'bistek', 'giassi', 'cooper', 'nacional', 'zaffari', 'bom preco',
      'dia', 'mini mercado', 'mercearia', 'hortifruti', 'sacolao',
    ],
    descriptionPrefix: 'Compra no mercado',
  },
  {
    name: 'Alimentação',
    keywords: [
      'ifood', 'lanche', 'restaurante', 'hamburguer', 'comida', 'pizza',
      'mcdonalds', 'bk', 'burger king', 'subway', 'kfc', 'bobs', 'habbibs',
      'madero', 'outback', 'sushi', 'padaria', 'confeitaria', 'lanchonete',
      'acai', 'sorvete', 'doceria', 'cafeteria', 'cafe', 'starbucks',
      'rappi', 'zap delivery', 'uber eats', 'almoco', 'janta', 'jantar',
    ],
    descriptionPrefix: 'Alimentação',
  },
  {
    name: 'Transporte',
    keywords: [
      'uber', '99', 'taxi', 'gasolina', 'combustivel', 'onibus', 'metro',
      'pedagio', 'estacionamento', 'oficina', 'mecanico', 'borracharia',
      'ipva', 'licenciamento', 'multa', 'alcool', 'diesel', 'etanol',
      'posto', 'shell', 'petrobras', 'br', 'ale',
    ],
    descriptionPrefix: 'Transporte',
  },
  {
    name: 'Moradia',
    keywords: [
      'aluguel', 'luz', 'agua', 'internet', 'condominio', 'gas',
      'celesc', 'cpfl', 'enel', 'copel', 'cemig', 'sabesp', 'casan',
      'oi', 'claro', 'vivo', 'tim', 'net', 'iptu', 'seguro residencial',
    ],
    descriptionPrefix: 'Moradia',
  },
  {
    name: 'Lazer',
    keywords: [
      'cinema', 'show', 'bar', 'festa', 'viagem', 'hotel', 'lazer',
      'spotify', 'netflix', 'disney', 'hbo', 'prime video', 'youtube premium',
      'xbox', 'playstation', 'steam', 'game', 'jogo', 'pousada',
      'parque', 'museu', 'teatro', 'ingresso', 'evento',
    ],
    descriptionPrefix: 'Lazer',
  },
  {
    name: 'Compras',
    keywords: [
      'roupa', 'vestido', 'calcado', 'tenis', 'loja', 'shopee', 'shein',
      'mercado livre', 'magalu', 'amazon', 'americanas', 'casas bahia',
      'renner', 'riachuelo', 'c&a', 'cea', 'havan', 'camicado',
      'presente', 'eletronico', 'celular', 'notebook', 'aliexpress',
    ],
    descriptionPrefix: 'Compras',
  },
  {
    name: 'Pet',
    keywords: [
      'pet shop', 'petshop', 'racao', 'veterinario', 'pet', 'banho e tosa',
      'petz', 'cobasi', 'vetnil', 'animal', 'cachorro', 'gato',
    ],
    descriptionPrefix: 'Pet',
  },
  {
    name: 'Educação',
    keywords: [
      'curso', 'escola', 'faculdade', 'universidade', 'material escolar',
      'livro', 'livraria', 'apostila', 'mensalidade escolar', 'udemy',
      'alura', 'coursera', 'treinamento', 'capacitacao',
    ],
    descriptionPrefix: 'Educação',
  },
  {
    name: 'Assinaturas',
    keywords: [
      'mensalidade', 'plano', 'assinatura', 'premium', 'pro', 'plus',
      'icloud', 'google one', 'chatgpt', 'notion', 'canva',
    ],
    descriptionPrefix: 'Assinatura',
  },
];

export function findCategoryByKeyword(text: string): { category: string; type?: 'expense' | 'income'; description?: string } | null {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => t.includes(kw))) {
      return {
        category: rule.name,
        type: rule.type || 'expense',
        description: rule.descriptionPrefix,
      };
    }
  }
  return null;
}

export function enhanceDescription(rawText: string, category: string): string {
  const t = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Rule-based enhancements for expenses
  if (t.includes('farmacia') || t.includes('remedio') || t.includes('drogaria')) return 'Compra em farmácia';
  if (t.includes('mercado') || t.includes('supermercado')) return 'Compra no mercado';
  if (t.includes('uber') && !t.includes('uber eats')) return 'Corrida de Uber';
  if (t.includes('uber eats')) return 'Pedido no Uber Eats';
  if (t.includes('ifood')) return 'Pedido no iFood';
  if (t.includes('99') && (t.includes('corrida') || t.includes('taxi'))) return 'Corrida 99';
  if (t.includes('gasolina') || t.includes('combustivel') || t.includes('posto')) return 'Combustível';
  if (t.includes('aluguel') && !t.includes('receb')) return 'Pagamento de aluguel';
  if (t.includes('luz') || t.includes('energia') || t.includes('celesc') || t.includes('enel')) return 'Conta de luz';
  if (t.includes('agua') || t.includes('sabesp') || t.includes('casan')) return 'Conta de água';
  if (t.includes('internet') || t.includes('oi ') || t.includes('claro') || t.includes('vivo') || t.includes('tim')) return 'Internet / Telefone';

  // For income transactions — try to extract the reason/source
  const incomeRule = CATEGORY_RULES.find(r => r.name === category && r.type === 'income');
  if (incomeRule) {
    // Try to extract description after income verb/keyword
    // "recebi um pix de 100000 da venda do meu carro" → "Venda do meu carro"
    const descMatch = rawText.match(
      /(?:recebi|ganhei|vendi|faturei|me pagaram|depositaram)\s+(?:um\s+)?(?:pix|deposito|pagamento|transferencia)?\s*(?:de\s+)?(?:r?\$?\s*)?(?:\d[\d.,]*\s*)?(?:reais?\s*)?(?:da|do|de|por|com|para|referente|ref)?\s*(.+)/i
    );
    if (descMatch && descMatch[1] && descMatch[1].trim().length >= 3) {
      const desc = descMatch[1].trim();
      return desc.charAt(0).toUpperCase() + desc.slice(1);
    }
    return incomeRule.descriptionPrefix || 'Recebimento';
  }

  // General clean up for expenses
  let clean = rawText
    .replace(/(gastei|paguei|comprei|valor|de |com |no |na |um |reais|centavos|conto)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean || clean.length < 2) {
    const rule = CATEGORY_RULES.find(r => r.name === category);
    return rule?.descriptionPrefix || 'Gasto Geral';
  }

  // Capitalize
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
