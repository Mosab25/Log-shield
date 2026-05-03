export type DerivedAttackSignal = {
  isAttack: boolean;
  attackType: "web_attack" | "suspicious_script" | null;
  attackLabel: string | null;
  severityHint: "low" | "medium" | "high" | "critical";
  reasons: string[];
};

const XSS_PATTERN = /<script|<\/script>|javascript:|onerror=|onload=|%3cscript|%3csvg|document\.cookie|alert\s*\(/i;
const SCRIPT_EXEC_PATTERN = /\beval\(|fromcharcode\(|atob\(|unescape\(|window\.[a-z_]+\s*=|innerhtml\s*=|settimeout\s*\(/i;
const CLI_SCRIPT_PATTERN = /\bpowershell\b|cmd\.exe|wscript|cscript|mshta|bash\s+-c|python\s+-c/i;

export function deriveAttackSignalFromText(...parts: Array<string | null | undefined>): DerivedAttackSignal {
  const text = parts.filter(Boolean).join(" ").trim();
  if (!text) {
    return {
      isAttack: false,
      attackType: null,
      attackLabel: null,
      severityHint: "low",
      reasons: [],
    };
  }

  const reasons: string[] = [];
  let attackType: DerivedAttackSignal["attackType"] = null;
  let attackLabel: string | null = null;
  let severity: DerivedAttackSignal["severityHint"] = "low";

  if (XSS_PATTERN.test(text)) {
    attackType = "web_attack";
    attackLabel = "Web Attack (Script/XSS)";
    severity = "high";
    reasons.push("Script/XSS payload pattern detected in content.");
  }

  if (SCRIPT_EXEC_PATTERN.test(text)) {
    attackType = attackType || "suspicious_script";
    attackLabel = attackLabel || "Suspicious Script Behavior";
    severity = severity === "low" ? "medium" : severity;
    reasons.push("Potential dynamic script execution pattern detected.");
  }

  if (CLI_SCRIPT_PATTERN.test(text)) {
    attackType = attackType || "suspicious_script";
    attackLabel = attackLabel || "Suspicious Script Artifact";
    severity = severity === "low" ? "medium" : severity;
    reasons.push("Command/script execution indicator detected.");
  }

  return {
    isAttack: Boolean(attackType),
    attackType,
    attackLabel,
    severityHint: severity,
    reasons,
  };
}

export function isScriptAttackText(...parts: Array<string | null | undefined>): boolean {
  return deriveAttackSignalFromText(...parts).isAttack;
}
