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
    const html = marked.parse(text, { breaks: true });
    // Strip dangerous tags — allow safe HTML only
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
  return escapeHtml(text).replace(/\n/g, '<br>');
}

export function formatTime(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
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
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
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
