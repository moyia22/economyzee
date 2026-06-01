import { V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { g as cn } from "./router-BxZ3CosB.js";
function Card({
  className,
  children,
  delay,
  variant = "default"
}) {
  const staggerClass = delay ? `stagger-${delay}` : "";
  const variantClasses = {
    default: "surface-card border border-border/60",
    glass: "glass border border-white/[0.06]",
    outline: "bg-transparent border border-border/80"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: cn(
        "card-hover animate-fade-in-up rounded-xl p-5",
        variantClasses[variant],
        staggerClass,
        className
      ),
      children
    }
  );
}
function CardTitle({
  title,
  description,
  action
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-4 flex items-start justify-between gap-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold tracking-tight", children: title }),
      description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: description })
    ] }),
    action
  ] });
}
export {
  Card as C,
  CardTitle as a
};
