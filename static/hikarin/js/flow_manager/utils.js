export function esc(str) {
  if (!str) return '';
  return str.replace(/&/g, '&').replace(/"/g, '"')
            .replace(/</g, '<').replace(/>/g, '>');
}

export const LABEL_PREFIX = '__label__';
