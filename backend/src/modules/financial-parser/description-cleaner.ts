export function cleanDescription(text: string): string {
  let cleaned = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Remover palavras de ação e conectores financeiros
  const keywords = [
    'gastei', 'paguei', 'comprei', 'compra', 'recebi', 'ganhei', 'entrou', 'lucro', 'renda', 
    'despesa', 'valor', 'reais', 'r$', 'pix', 'pago', 'recebido', 'no', 'na', 'em', 'de', 
    'do', 'da', 'com', 'pelo', 'pela', 'gasto'
  ];
  
  // Remover números e valores decimais
  cleaned = cleaned.replace(/r\$\s*\d+(?:[.,]\d+)?/gi, '');
  cleaned = cleaned.replace(/\b\d+(?:[.,]\d+)?\b/g, '');

  const words = cleaned.split(/\s+/);
  const filteredWords = words.filter(word => !keywords.includes(word) && word.length > 1);

  let final = filteredWords.join(' ').trim();

  // 2. Se a limpeza foi muito agressiva e não sobrou nada, tentar recuperar do original sem o valor
  if (final.length < 2) {
    const originalWithoutValue = text.replace(/r\$\s*\d+(?:[.,]\d+)?/gi, '')
                                     .replace(/\b\d+(?:[.,]\d+)?\b/g, '')
                                     .replace(/\s+/g, ' ').trim();
    final = originalWithoutValue;
  }

  // 3. Capitalização Profissional
  if (!final) return 'Outros';
  return final.charAt(0).toUpperCase() + final.slice(1);
}
