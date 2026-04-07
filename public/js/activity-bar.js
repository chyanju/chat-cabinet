/**
 * Activity Bar — vertical icon sidebar for switching views.
 */

const VIEWS = [
  {
    id: 'source',
    label: 'Sources',
    // Folder/cabinet icon
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
    </svg>`,
  },
  {
    id: 'tag',
    label: 'Tags',
    // Tag icon
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
      <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
    </svg>`,
  },
];

export function initActivityBar(containerEl, { onViewChange }) {
  containerEl.innerHTML = '';

  for (const view of VIEWS) {
    const btn = document.createElement('button');
    btn.className = 'activity-btn' + (view.id === 'source' ? ' active' : '');
    btn.innerHTML = view.icon;
    btn.title = view.label;
    btn.dataset.view = view.id;

    btn.addEventListener('click', () => {
      for (const b of containerEl.querySelectorAll('.activity-btn')) b.classList.remove('active');
      btn.classList.add('active');
      onViewChange(view.id);
    });

    containerEl.appendChild(btn);
  }
}
