import { useUiStore } from '../stores/ui.js';

/**
 * Redaction rule definitions.
 * Each rule has: id, label, description, and a replacer function.
 */
export const REDACTION_RULES = [
  {
    id: 'paths',
    label: 'File paths',
    description: 'Absolute paths containing usernames',
    replacer: (text) => {
      // macOS: /Users/username/...
      text = text.replace(/\/Users\/[^\s/'"`,;)}\]]+/g, (m) => {
        const parts = m.split('/');
        // parts = ['', 'Users', 'username', ...]
        if (parts.length >= 3) {
          parts[2] = '[USER]';
        }
        return parts.join('/');
      });
      // Linux: /home/username/...
      text = text.replace(/\/home\/[^\s/'"`,;)}\]]+/g, (m) => {
        const parts = m.split('/');
        if (parts.length >= 3) {
          parts[2] = '[USER]';
        }
        return parts.join('/');
      });
      // Windows: C:\Users\username\...
      text = text.replace(/[A-Z]:\\Users\\[^\s\\'"`,;)}\]]+/g, (m) => {
        const parts = m.split('\\');
        if (parts.length >= 3) {
          parts[2] = '[USER]';
        }
        return parts.join('\\');
      });
      return text;
    },
  },
  {
    id: 'emails',
    label: 'Email addresses',
    description: 'name@domain patterns',
    replacer: (text) => {
      return text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
    },
  },
  {
    id: 'ipv4',
    label: 'IPv4 addresses',
    description: 'e.g. 192.168.1.100',
    replacer: (text) => {
      // Avoid matching version numbers like 1.2.3 (only 3 octets) or semver
      return text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, (m) => {
        // Check it looks like a real IP (each octet 0-255)
        const octets = m.split('.').map(Number);
        if (octets.every((o) => o >= 0 && o <= 255)) return '[IPv4]';
        return m;
      });
    },
  },
  {
    id: 'secrets',
    label: 'API keys & tokens',
    description: 'Bearer tokens, sk-*, ghp_*, AWS keys, etc.',
    replacer: (text) => {
      // OpenAI-style keys
      text = text.replace(/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY]');
      // GitHub personal access tokens
      text = text.replace(/ghp_[a-zA-Z0-9]{36}/g, '[API_KEY]');
      text = text.replace(/gho_[a-zA-Z0-9]{36}/g, '[API_KEY]');
      text = text.replace(/ghs_[a-zA-Z0-9]{36}/g, '[API_KEY]');
      text = text.replace(/github_pat_[a-zA-Z0-9_]{82}/g, '[API_KEY]');
      // AWS access key IDs
      text = text.replace(/AKIA[0-9A-Z]{16}/g, '[API_KEY]');
      // Bearer tokens
      text = text.replace(/Bearer\s+[a-zA-Z0-9._\-]{20,}/g, 'Bearer [TOKEN]');
      // Generic env var assignments for sensitive keys
      text = text.replace(
        /((?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY|AUTH)[A-Z_]*)=(['"]?)([^\s'"]{8,})\2/gi,
        '$1=$2[REDACTED]$2',
      );
      return text;
    },
  },
  {
    id: 'git_urls',
    label: 'Git remote URLs',
    description: 'SSH and HTTPS repo URLs',
    replacer: (text) => {
      // git@host:org/repo.git
      text = text.replace(/git@[^:\s]+:[^\s]+\.git/g, 'git@[HOST]:[REPO].git');
      // https://github.com/org/repo or similar
      text = text.replace(
        /https?:\/\/(?:github|gitlab|bitbucket)\.[^\s/]+\/[^\s)'"`,;}\]]+/g,
        (m) => {
          try {
            const url = new URL(m);
            return `${url.protocol}//[HOST]/[REPO]`;
          } catch {
            return '[GIT_URL]';
          }
        },
      );
      return text;
    },
  },
  {
    id: 'db_urls',
    label: 'Database connection strings',
    description: 'postgres://, mysql://, mongodb://',
    replacer: (text) => {
      return text.replace(
        /(?:postgres|postgresql|mysql|mongodb|redis|amqp):\/\/[^\s'"`,;)}\]]+/gi,
        '[DB_URL]',
      );
    },
  },
];

/**
 * Apply active redaction rules to a string.
 * Reads toggles from the UI store.
 */
export function redact(text) {
  if (!text) return text;
  const ui = useUiStore();
  if (!ui.privacyEnabled) return text;
  const presets = ui.privacyPresets;
  if (!presets || Object.keys(presets).length === 0) return text;

  let result = text;
  for (const rule of REDACTION_RULES) {
    if (presets[rule.id]) {
      result = rule.replacer(result);
    }
  }
  return result;
}

/**
 * Redact, then render through a transform (e.g. markdown).
 * Use this for v-html content where we need to redact before markdown parsing.
 */
export function redactMarkdown(text, renderFn) {
  return renderFn(redact(text));
}
