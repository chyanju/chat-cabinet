let idCounter = 0;

export function genId() {
  return `coll-${++idCounter}`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMarkdown(text) {
  if (typeof marked !== 'undefined' && marked.parse) {
    return marked.parse(text, { breaks: true });
  }
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch { return ts; }
}

export function formatTimeBrief(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ''; }
}

export function setupCollapse(container) {
  for (const toggle of container.querySelectorAll('.collapse-toggle')) {
    toggle.addEventListener('click', () => {
      const target = document.getElementById(toggle.dataset.target);
      if (target) {
        target.classList.toggle('open');
        toggle.classList.toggle('open');
      }
    });
  }
}

export function createBlock(cssClass, label, ts) {
  const block = document.createElement('div');
  block.className = `msg-block ${cssClass}`;
  block.innerHTML = `
    <div class="msg-label">
      ${escapeHtml(label)}
      <span style="font-weight:400;font-size:10px;color:var(--text-muted);margin-left:auto">${formatTimeBrief(ts)}</span>
    </div>
    <div class="msg-body"></div>
  `;
  return block;
}

export function addCollapsible(block, title, fullText, startClosed = false) {
  const id = genId();
  const wrapper = document.createElement('div');
  wrapper.style.padding = '0 16px 12px';
  wrapper.innerHTML = `
    <div class="collapse-toggle" data-target="${id}" style="font-size:11px;color:var(--accent);cursor:pointer;margin-top:6px">${escapeHtml(title)}</div>
    <div class="collapsible-content ${startClosed ? '' : 'open'}" id="${id}">
      <pre class="tool-cmd" style="margin-top:6px;max-height:500px">${escapeHtml(fullText)}</pre>
    </div>
  `;
  setupCollapse(wrapper);
  block.appendChild(wrapper);
}

export function extractText(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'input_text' || c.type === 'output_text' || c.type === 'text')
      .map(c => c.text || '')
      .join('\n');
  }
  return '';
}
