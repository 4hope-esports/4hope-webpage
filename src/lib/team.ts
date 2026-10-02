const TEAM_NAME_ALLOWED = /^[A-Za-z0-9_\- ]+$/;
const TEAM_CODE_PATTERN = /^[A-Z0-9]{2}$/;

/** Trims, collapses internal whitespace, and validates a team name. Returns the normalized name, or an error message. */
export function normalizeTeamName(raw: string): { value: string } | { error: string } {
  const collapsed = raw.trim().replace(/\s+/g, " ");
  if (collapsed.length < 3 || collapsed.length > 24) {
    return { error: "Team name must be 3–24 characters." };
  }
  if (!TEAM_NAME_ALLOWED.test(collapsed)) {
    return { error: "Team name can only contain letters, numbers, spaces, _ and -." };
  }
  return { value: collapsed };
}

export function teamNameKey(name: string): string {
  return name.toLowerCase();
}

export function isValidTeamCode(code: string): boolean {
  return TEAM_CODE_PATTERN.test(code);
}

/** Derives a default 2-letter uppercase code from a team name (e.g. "Night Owls" -> "NO"). */
export function defaultTeamCode(name: string): string {
  const letters = name.toUpperCase().match(/[A-Z0-9]/g) ?? [];
  const words = name.toUpperCase().split(/\s+/).filter(Boolean);

  let code = "";
  if (words.length >= 2) {
    code = (words[0][0] ?? "") + (words[1][0] ?? "");
  } else {
    code = letters.slice(0, 2).join("");
  }
  code = code.replace(/[^A-Z0-9]/g, "");
  while (code.length < 2) code += "X";
  return code.slice(0, 2);
}
