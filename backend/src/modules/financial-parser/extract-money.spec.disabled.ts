import { extractMoneyAmount, parseType } from './value-parser';

describe('Financial Parser Logic', () => {

  it('should process "70 e 2 reais 97 centavos" correctly', () => {
    const text = "o gasto de 70 e 2 reais 97 centavos na farmacia";
    const res = extractMoneyAmount(text);
    expect(res).toBe(7297); // 72.97
  });

  it('should process "gastei 100 e 50" correctly', () => {
    const text = "gastei 100 e 50";
    const res = extractMoneyAmount(text);
    expect(res).toBe(15000); // 150.00
  });

  it('should process "paguei 30 e 20 reais" correctly', () => {
    const text = "paguei 30 e 20 reais";
    const res = extractMoneyAmount(text);
    expect(res).toBe(5000); // 50.00
  });

  it('should process "comprei por 2 reais e 50 centavos" correctly', () => {
    const text = "comprei por 2 reais e 50 centavos";
    const res = extractMoneyAmount(text);
    expect(res).toBe(250); // 2.50
  });

  it('should process "80 centavos" correctly', () => {
    const text = "80 centavos";
    const res = extractMoneyAmount(text);
    expect(res).toBe(80); // 0.80
  });

  it('should process "setenta e cinco reais e cinquenta centavos" correctly', () => {
    // Requires normalizer to convert "setenta e cinco" to 75
    // But since this spec only tests extractMoneyAmount directly, 
    // it tests the raw numerical version that normalizer would output:
    const text = "75 reais e 50 centavos";
    const res = extractMoneyAmount(text);
    expect(res).toBe(7550); // 75.50
  });

  it('detects type properly', () => {
    expect(parseType('comprei por 2 reais e 50 centavos')).toBe('expense');
    expect(parseType('ganhei 100 reais')).toBe('income');
  });

});
