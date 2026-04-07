/**
 * Menu Bar — File and Help dropdown menus.
 */

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'Close Tab', shortcut: 'Ctrl+W', action: 'close-tab' },
      { type: 'separator' },
      { label: 'Export as Markdown', action: 'export-md' },
      { label: 'Export as Text', action: 'export-txt' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'View on GitHub', action: 'github' },
      { type: 'separator' },
      { label: 'About Chat Cabinet', action: 'about' },
    ],
  },
];

let openMenuIndex = -1;
let menuBarEl = null;
let menuOpen = false;

export function initMenuBar(containerEl) {
  menuBarEl = containerEl;
  containerEl.innerHTML = '';

  for (let i = 0; i < MENUS.length; i++) {
    const menu = MENUS[i];
    const btn = document.createElement('div');
    btn.className = 'menubar-item';
    btn.textContent = menu.label;
    btn.dataset.index = i;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (openMenuIndex === i) {
        closeAllMenus();
      } else {
        openMenu(i);
      }
    });

    btn.addEventListener('mouseenter', () => {
      if (menuOpen && openMenuIndex !== i) {
        openMenu(i);
      }
    });

    const dropdown = document.createElement('div');
    dropdown.className = 'menubar-dropdown';
    dropdown.dataset.index = i;

    for (const item of menu.items) {
      if (item.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'menubar-separator';
        dropdown.appendChild(sep);
        continue;
      }

      const row = document.createElement('div');
      row.className = 'menubar-dropdown-item';
      row.innerHTML = `
        <span>${item.label}</span>
        ${item.shortcut ? `<span class="menubar-shortcut">${item.shortcut}</span>` : ''}
      `;
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllMenus();
        handleAction(item.action);
      });
      dropdown.appendChild(row);
    }

    btn.appendChild(dropdown);
    containerEl.appendChild(btn);
  }

  // Close on outside click
  document.addEventListener('click', () => {
    if (menuOpen) closeAllMenus();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) closeAllMenus();
  });
}

function openMenu(index) {
  closeAllMenus();
  openMenuIndex = index;
  menuOpen = true;
  const items = menuBarEl.querySelectorAll('.menubar-item');
  const dropdowns = menuBarEl.querySelectorAll('.menubar-dropdown');
  if (items[index]) items[index].classList.add('open');
  if (dropdowns[index]) dropdowns[index].classList.add('open');
}

function closeAllMenus() {
  openMenuIndex = -1;
  menuOpen = false;
  for (const el of menuBarEl.querySelectorAll('.menubar-item')) el.classList.remove('open');
  for (const el of menuBarEl.querySelectorAll('.menubar-dropdown')) el.classList.remove('open');
}

function handleAction(action) {
  switch (action) {
    case 'close-tab':
      document.dispatchEvent(new CustomEvent('cabinet:close-tab'));
      break;
    case 'export-md':
      document.dispatchEvent(new CustomEvent('cabinet:export', { detail: { format: 'md' } }));
      break;
    case 'export-txt':
      document.dispatchEvent(new CustomEvent('cabinet:export', { detail: { format: 'txt' } }));
      break;
    case 'github':
      window.open('https://github.com', '_blank');
      break;
    case 'about':
      alert('Chat Cabinet v1.0.0\nA local viewer for AI coding assistant session logs.');
      break;
  }
}
