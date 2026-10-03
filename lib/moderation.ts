/**
 * Name checks and a lightweight rude-word filter (a blocklist checked against a normalised
 * version of the text, with leetspeak and separators removed). Names are not filtered; the
 * word list is used to mask rude words in chat and to check school names.
 */
const BLOCKED_SUBSTRINGS = [
  "fuck", "fuk", "shit", "bitch", "bastard", "cunt", "pussy", "whore", "slut", "nigg",
  "faggot", "penis", "vagina", "boob", "porn", "sexy", "asshole", "wanker", "motherf",
  "idiot", "stupid", "olodo", "mumu", "ashawo", "werey", "suicide",
];

/** Short words only blocked when they are the whole word, to avoid false positives. */
const BLOCKED_WORDS = ["ass", "fag", "hoe", "ode", "dumb", "die", "nude", "dick", "sex", "rape", "kill"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s", "!": "i" };

function normalise(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((c) => LEET[c] ?? c)
    .join("");
}

export function containsBlockedWord(text: string): boolean {
  const norm = normalise(text);
  const squashed = norm.replace(/[^a-z]/g, "");
  if (BLOCKED_SUBSTRINGS.some((w) => squashed.includes(w))) return true;
  const words = norm.split(/[^a-z]+/).filter(Boolean);
  return words.some((w) => BLOCKED_WORDS.includes(w));
}

export function cleanName(raw: string): string {
  return raw.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
}

/** Longest name, in characters (an emoji counts as one). Keeps names readable above heads. */
export const MAX_NAME_LENGTH = 20;

export function nameLength(name: string): number {
  return Array.from(name).length;
}

/**
 * Returns an error message, or null when the display name is acceptable. Any characters are
 * allowed (accents, emoji, other scripts); only empty and over-long names are refused.
 */
export function validateDisplayName(raw: string): string | null {
  const name = cleanName(raw);
  if (!name) return "Please enter your name.";
  if (nameLength(name) > MAX_NAME_LENGTH) return `Names can be up to ${MAX_NAME_LENGTH} characters.`;
  return null;
}

/** Replaces rude words in a chat message with asterisks, keeping the rest of the message. */
export function maskRudeWords(text: string): string {
  return text.replace(/[\p{L}\p{N}@$!]+/gu, (word) => (containsBlockedWord(word) ? "*".repeat(Array.from(word).length) : word));
}
