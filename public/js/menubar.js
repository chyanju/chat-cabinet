/**
 * Menu Bar — Brand, File/Help dropdowns, and panel toggle.
 */

const MENUS = [
  {
    label: 'File',
    items: [
      { label: 'Close Tab', shortcut: 'Ctrl+W', action: 'close-tab' },
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

  // Brand
  const brand = document.createElement('div');
  brand.className = 'menubar-brand';
  brand.innerHTML = `<img src="cabinet.svg" alt="" class="menubar-brand-icon"><span>Chat Cabinet</span>`;
  containerEl.appendChild(brand);

  // Menu items
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

  // Detail panel toggle (right-aligned, like VS Code sidebar toggle)
  const toggle = document.createElement('button');
  toggle.className = 'menubar-panel-toggle';
  toggle.title = 'Toggle Detail Panel';
  toggle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`;
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('cabinet:toggle-detail'));
  });
  containerEl.appendChild(toggle);

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
    case 'github':
      window.open('https://github.com', '_blank');
      break;
    case 'about':
      alert('Chat Cabinet v1.0.0\nA local viewer for AI coding assistant session logs.');
      break;
  }
}
