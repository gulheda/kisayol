/* ==========================================================================
   kısayol — sık kullanılanlar sayfası
   Saf JavaScript, veriler tarayıcının localStorage'ında saklanır.
   ========================================================================== */

const STORAGE_KEY = 'kisayol.v2';

const DEFAULT_LINKS = [
  { name: 'GitHub', url: 'https://github.com', emoji: '', clicks: 14 },
  { name: 'YouTube', url: 'https://youtube.com', emoji: '', clicks: 11 },
  { name: 'ChatGPT', url: 'https://chat.openai.com', emoji: '', clicks: 9 },
  { name: 'Gmail', url: 'https://mail.google.com', emoji: '', clicks: 8 },
  { name: 'Google Drive', url: 'https://drive.google.com', emoji: '', clicks: 6 },
  { name: 'Instagram', url: 'https://instagram.com', emoji: '', clicks: 3 },
  { name: 'Wikipedia', url: 'https://wikipedia.org', emoji: '', clicks: 2 },
];

function uid(){ return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn('State okunamadı, varsayılana dönülüyor.', e); }
  return seedState();
}

function seedState(){
  const links = DEFAULT_LINKS.map(l => ({ id: uid(), createdAt: Date.now(), ...l }));
  return { theme: null, links };
}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();

/* ---------------- helpers ---------------- */

function normalizeUrl(input){
  let v = (input || '').trim();
  if(!v) return '';
  if(!/^https?:\/\//i.test(v)) v = 'https://' + v;
  return v;
}

function getDomain(url){
  try{ return new URL(url).hostname.replace(/^www\./, ''); }
  catch(e){ return url; }
}

function faviconUrl(url){
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 2200);
}

/* ---------------- theme ---------------- */

function applyTheme(){
  const preferred = state.theme || 'light';
  document.documentElement.setAttribute('data-theme', preferred);
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  state.theme = current === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
});

/* ---------------- clock ---------------- */

function updateClock(){
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const days = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
  document.getElementById('clock').textContent = `${days[now.getDay()]} · ${hh}:${mm}`;
}

/* ---------------- rendering ---------------- */

function sortedLinks(){
  return [...state.links].sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || a.name.localeCompare(b.name, 'tr'));
}

function faviconMarkup(link){
  if(link.emoji){
    return `<div class="favicon-wrap">${escapeHtml(link.emoji)}</div>`;
  }
  const url = normalizeUrl(link.url);
  return `<div class="favicon-wrap"><img src="${faviconUrl(url)}" alt="" loading="lazy" onerror="this.parentElement.textContent='${escapeHtml((link.name[0]||'?').toUpperCase())}'"></div>`;
}

function render(){
  const grid = document.getElementById('linkGrid');
  const empty = document.getElementById('emptyState');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  let links = sortedLinks();
  if(query) links = links.filter(l => l.name.toLowerCase().includes(query) || getDomain(normalizeUrl(l.url)).toLowerCase().includes(query));

  if(links.length === 0){
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = links.map((l, i) => {
    const clicks = l.clicks || 0;
    const isTop = !query && clicks > 0 && i < 3;
    const rankBadge = isTop ? `<span class="rank-badge">#${i + 1} en çok kullanılan</span>` : '';
    return `
    <div class="link-card ${isTop ? 'top-rank' : ''}" data-id="${l.id}" style="--i:${i}" role="button" tabindex="0" title="${escapeHtml(l.name)} sitesini aç">
      ${rankBadge}
      <div class="card-top">
        ${faviconMarkup(l)}
        <button class="card-menu-btn" data-id="${l.id}" aria-label="Seçenekler">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>
        </button>
        <div class="card-menu hidden" data-menu="${l.id}">
          <button data-action="edit" data-id="${l.id}">Düzenle</button>
          <button data-action="delete" data-id="${l.id}" class="danger">Sil</button>
        </div>
      </div>
      <div class="card-body">
        <div class="card-name">${escapeHtml(l.name)}</div>
        <div class="card-domain">${escapeHtml(getDomain(normalizeUrl(l.url)))}</div>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.link-card').forEach(card => {
    const openCard = () => {
      const id = card.dataset.id;
      const link = state.links.find(l => l.id === id);
      if(!link) return;
      registerClick(id);
      window.open(normalizeUrl(link.url), '_blank', 'noopener');
    };
    card.addEventListener('click', (e) => {
      if(e.target.closest('.card-menu-btn') || e.target.closest('.card-menu')) return;
      openCard();
    });
    card.addEventListener('keydown', (e) => {
      if((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.card-menu-btn') && !e.target.closest('.card-menu')){
        e.preventDefault();
        openCard();
      }
    });
  });

  grid.querySelectorAll('.card-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = grid.querySelector(`.card-menu[data-menu="${btn.dataset.id}"]`);
      const wasHidden = menu.classList.contains('hidden');
      closeAllCardMenus();
      if(wasHidden) menu.classList.remove('hidden');
    });
  });

  grid.querySelectorAll('.card-menu button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      closeAllCardMenus();
      if(btn.dataset.action === 'edit') openLinkModal(id);
      else if(btn.dataset.action === 'delete') confirmDeleteLink(id);
    });
  });
}

function closeAllCardMenus(){
  document.querySelectorAll('.card-menu').forEach(m => m.classList.add('hidden'));
}

function registerClick(id){
  const link = state.links.find(l => l.id === id);
  if(!link) return;
  link.clicks = (link.clicks || 0) + 1;
  saveState();
  setTimeout(render, 150);
}

/* ---------------- search ---------------- */

document.getElementById('searchInput').addEventListener('input', render);

/* ---------------- link modal (add/edit) ---------------- */

const linkModalOverlay = document.getElementById('linkModalOverlay');
const linkForm = document.getElementById('linkForm');

function openLinkModal(id){
  closeAllCardMenus();
  document.getElementById('linkModalTitle').textContent = id ? 'Linki Düzenle' : 'Yeni Link';
  document.getElementById('linkId').value = id || '';

  if(id){
    const l = state.links.find(x => x.id === id);
    document.getElementById('linkName').value = l.name;
    document.getElementById('linkUrl').value = l.url;
    document.getElementById('linkEmoji').value = l.emoji || '';
  }else{
    linkForm.reset();
  }
  linkModalOverlay.classList.remove('hidden');
  setTimeout(() => document.getElementById('linkName').focus(), 50);
}

function closeLinkModal(){ linkModalOverlay.classList.add('hidden'); }

document.getElementById('addLinkBtn').addEventListener('click', () => openLinkModal(null));
document.getElementById('emptyAddBtn').addEventListener('click', () => openLinkModal(null));
document.getElementById('linkModalClose').addEventListener('click', closeLinkModal);
document.getElementById('linkCancelBtn').addEventListener('click', closeLinkModal);
linkModalOverlay.addEventListener('click', (e) => { if(e.target === linkModalOverlay) closeLinkModal(); });

linkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('linkId').value;
  const name = document.getElementById('linkName').value.trim();
  const url = normalizeUrl(document.getElementById('linkUrl').value.trim());
  const emoji = document.getElementById('linkEmoji').value.trim();

  if(!name || !url){ showToast('Lütfen ad ve adres gir.'); return; }

  if(id){
    const l = state.links.find(x => x.id === id);
    Object.assign(l, { name, url, emoji });
    showToast('Link güncellendi.');
  }else{
    state.links.push({ id: uid(), name, url, emoji, clicks: 0, createdAt: Date.now() });
    showToast('Link eklendi.');
  }
  saveState();
  closeLinkModal();
  render();
});

function confirmDeleteLink(id){
  const l = state.links.find(x => x.id === id);
  if(!l) return;
  openConfirm(`"${l.name}" silinsin mi?`, () => {
    state.links = state.links.filter(x => x.id !== id);
    saveState();
    render();
    showToast('Link silindi.');
  });
}

/* ---------------- confirm modal ---------------- */

const confirmOverlay = document.getElementById('confirmOverlay');
let confirmCallback = null;

function openConfirm(message, callback){
  document.getElementById('confirmMessage').textContent = message;
  confirmCallback = callback;
  confirmOverlay.classList.remove('hidden');
}
document.getElementById('confirmCancel').addEventListener('click', () => { confirmOverlay.classList.add('hidden'); confirmCallback = null; });
document.getElementById('confirmOk').addEventListener('click', () => {
  confirmOverlay.classList.add('hidden');
  if(confirmCallback) confirmCallback();
  confirmCallback = null;
});
confirmOverlay.addEventListener('click', (e) => { if(e.target === confirmOverlay){ confirmOverlay.classList.add('hidden'); confirmCallback = null; } });

/* ---------------- menu dropdown (export/import/reset) ---------------- */

const menuDropdown = document.getElementById('menuDropdown');
document.getElementById('menuToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.toggle('hidden');
});
document.addEventListener('click', () => { menuDropdown.classList.add('hidden'); closeAllCardMenus(); });

document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kisayol-yedek.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('JSON olarak dışa aktarıldı.');
});

document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!Array.isArray(data.links)) throw new Error('geçersiz format');
      state = data;
      saveState();
      applyTheme();
      render();
      showToast('Veriler içe aktarıldı.');
    }catch(err){
      showToast('İçe aktarma başarısız: dosya geçerli değil.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('resetBtn').addEventListener('click', () => {
  openConfirm('Tüm linkler silinip varsayılana dönülecek. Emin misin?', () => {
    state = seedState();
    saveState();
    render();
    showToast('Varsayılana sıfırlandı.');
  });
});

/* ---------------- keyboard shortcuts ---------------- */

document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if(e.key === 'Escape'){
    closeLinkModal();
    confirmOverlay.classList.add('hidden');
    menuDropdown.classList.add('hidden');
    closeAllCardMenus();
    if(typing) document.activeElement.blur();
    return;
  }
  if(typing) return;

  if(e.key === '/'){
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }else if(e.key.toLowerCase() === 'n'){
    e.preventDefault();
    openLinkModal(null);
  }
});

/* ---------------- init ---------------- */

applyTheme();
updateClock();
setInterval(updateClock, 15000);
render();
