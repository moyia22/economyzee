const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2
});
function formatBRL(n) {
  return BRL.format(n / 100);
}
function formatCompactBRL(n) {
  const valueInReais = n / 100;
  if (Math.abs(valueInReais) >= 1e3) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(valueInReais);
  }
  return BRL.format(valueInReais);
}
function formatPercent(n, digits = 1) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
function formatRelative(date) {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 6e4);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} d atrás`;
  return date.toLocaleDateString("pt-BR");
}
function formatDate(date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function formatDateLong(date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}
export {
  formatBRL as a,
  formatDateLong as b,
  formatCompactBRL as c,
  formatPercent as d,
  formatRelative as e,
  formatDate as f
};
