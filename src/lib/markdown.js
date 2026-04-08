import { marked } from 'marked';

export function renderMarkdown(text) {
  if (!text) return '';
  const html = marked.parse(text, { breaks: true });
  // Strip dangerous tags
  const div = document.createElement('div');
  div.innerHTML = html;
  for (const el of div.querySelectorAll('script,iframe,object,embed,form,input,textarea,button')) {
    el.remove();
  }
  for (const el of div.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
    }
  }
  return div.innerHTML;
}
