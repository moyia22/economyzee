import { V as jsxRuntimeExports } from "./worker-entry-CMu_oXBf.js";
import { c as createLucideIcon, g as cn } from "./router-BxZ3CosB.js";
import { P as Pencil } from "./pencil-DU1eWLO_.js";
import { S as Send } from "./send-Bgn39PPm.js";
const __iconNode = [
  [
    "path",
    {
      d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      key: "1oefj6"
    }
  ],
  ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5", key: "wfsgrz" }],
  ["path", { d: "M12 18v-6", key: "17g6i2" }],
  ["path", { d: "m9 15 3 3 3-3", key: "1npd3o" }]
];
const FileDown = createLucideIcon("file-down", __iconNode);
function OriginBadge({ origin, className }) {
  const config = {
    TELEGRAM: {
      label: "Telegram",
      icon: Send,
      cls: "bg-info/15 text-info border-info/25"
    },
    MANUAL: {
      label: "Manual",
      icon: Pencil,
      cls: "bg-muted text-muted-foreground border-border"
    },
    IMPORT: {
      label: "Importação",
      icon: FileDown,
      cls: "bg-warning/15 text-warning border-warning/25"
    }
  }[origin?.toUpperCase() || "MANUAL"];
  const Icon = config.icon;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium",
        config.cls,
        className
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Icon, { className: "h-2.5 w-2.5", strokeWidth: 2.5 }),
        config.label
      ]
    }
  );
}
function StatusPill({ status }) {
  const map = {
    PAID: { label: "Pago", cls: "bg-success/15 text-success border-success/25" },
    PENDING: { label: "Pendente", cls: "bg-warning/15 text-warning border-warning/25" },
    OVERDUE: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/25" }
  }[status?.toUpperCase() || "PENDING"];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "span",
    {
      className: cn(
        "inline-flex h-5 items-center gap-1 rounded-md border px-1.5 text-[10px] font-medium",
        map.cls
      ),
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-current" }),
        map.label
      ]
    }
  );
}
export {
  OriginBadge as O,
  StatusPill as S
};
