/* ==========================================================================
   kısayol — sık kullanılanlar sayfası
   Saf JavaScript, veriler tarayıcının localStorage'ında saklanır.
   ========================================================================== */

const STORAGE_KEY = 'kisayol.v3';
const FAVORITES_ID = '__fav__';

const DEFAULT_CATEGORIES = [];
const DEFAULT_LINKS = [];

function uid(){ return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn('State okunamadı, varsayılana dönülüyor.', e); }
  return seedState();
}

function seedState(){
  const categories = DEFAULT_CATEGORIES.map(c => ({ id: uid(), ...c }));
  const links = DEFAULT_LINKS.map(l => ({ id: uid(), createdAt: Date.now(), ...l }));
  return { theme: null, categories, links };
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

function categoryById(id){ return state.categories.find(c => c.id === id); }

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

function faviconMarkup(link){
  if(link.emoji){
    return `<div class="favicon-wrap">${escapeHtml(link.emoji)}</div>`;
  }
  const url = normalizeUrl(link.url);
  const fallback = escapeHtml((link.name[0] || '?').toUpperCase());
  return `<div class="favicon-wrap"><img src="${faviconUrl(url)}" alt="" loading="lazy" data-fallback="${fallback}"></div>`;
}

function renderRow(link, rankIndex){
  const rankBadge = rankIndex !== null ? `<span class="row-rank">#${rankIndex + 1}</span>` : '';
  return `
    <div class="link-row" data-id="${link.id}" role="button" tabindex="0" title="${escapeHtml(link.name)} sitesini aç">
      ${rankBadge}
      ${faviconMarkup(link)}
      <div class="row-body">
        <div class="row-name">${escapeHtml(link.name)}</div>
        <div class="row-domain">${escapeHtml(getDomain(normalizeUrl(link.url)))}</div>
      </div>
      <button class="row-menu-btn" data-id="${link.id}" aria-label="Seçenekler">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>
      </button>
      <div class="row-menu hidden" data-menu="${link.id}">
        <button data-action="edit" data-id="${link.id}">Düzenle</button>
        <button data-action="delete" data-id="${link.id}" class="danger">Sil</button>
      </div>
    </div>`;
}

function renderSection(section){
  const rowsHtml = section.links.map((l, i) => renderRow(l, section.special ? i : null)).join('');
  const emptyHint = (!section.special && section.links.length === 0)
    ? `<p class="list-empty-hint">Bu başlıkta henüz link yok.</p>` : '';
  const addBtn = !section.special
    ? `<button class="add-to-cat-btn" data-cat="${section.id}">+ link ekle</button>` : '';
  return `
    <section class="category-section" data-cat="${section.id}">
      <div class="section-heading">
        ${section.special ? '<span class="section-star">★</span>' : ''}
        <h3>${escapeHtml(section.name)}</h3>
        ${addBtn}
      </div>
      <div class="link-list">
        ${rowsHtml}
      </div>
      ${emptyHint}
    </section>`;
}

function render(){
  const container = document.getElementById('categoriesContainer');
  const empty = document.getElementById('emptyState');
  const emptyTitle = document.querySelector('.empty-title');
  const emptySub = document.querySelector('.empty-sub');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  const matches = (l) => !query || l.name.toLowerCase().includes(query) || getDomain(normalizeUrl(l.url)).toLowerCase().includes(query);

  const favLinks = [...state.links]
    .filter(l => (l.clicks || 0) > 0)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 5)
    .filter(matches);

  const sections = [];
  if(favLinks.length) sections.push({ id: FAVORITES_ID, name: 'Sık Kullanılanlar', special: true, links: favLinks });

  state.categories.forEach(cat => {
    const links = state.links.filter(l => l.categoryId === cat.id).filter(matches);
    if(!query || links.length) sections.push({ id: cat.id, name: cat.name, special: false, links });
  });

  const nothingAtAll = state.categories.length === 0 && state.links.length === 0;

  if(nothingAtAll){
    container.innerHTML = '';
    emptyTitle.textContent = 'Henüz link yok';
    emptySub.textContent = 'Bir başlık altında ilk linkini ekleyerek başlangıç sayfanı oluştur.';
    empty.classList.remove('hidden');
    return;
  }

  if(query && sections.length === 0){
    container.innerHTML = '';
    emptyTitle.textContent = 'Sonuç bulunamadı';
    emptySub.textContent = `"${query}" ile eşleşen bir link yok.`;
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  container.innerHTML = sections.map(renderSection).join('');

  container.querySelectorAll('.favicon-wrap img').forEach(img => {
    img.addEventListener('error', () => {
      img.parentElement.textContent = img.dataset.fallback;
    }, { once: true });
  });

  container.querySelectorAll('.link-row').forEach(row => {
    const openRow = () => {
      const id = row.dataset.id;
      const link = state.links.find(l => l.id === id);
      if(!link) return;
      registerClick(id);
      window.open(normalizeUrl(link.url), '_blank', 'noopener');
    };
    row.addEventListener('click', (e) => {
      if(e.target.closest('.row-menu-btn') || e.target.closest('.row-menu')) return;
      openRow();
    });
    row.addEventListener('keydown', (e) => {
      if((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.row-menu-btn') && !e.target.closest('.row-menu')){
        e.preventDefault();
        openRow();
      }
    });
  });

  container.querySelectorAll('.row-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = container.querySelector(`.row-menu[data-menu="${btn.dataset.id}"]`);
      const wasHidden = menu.classList.contains('hidden');
      closeAllRowMenus();
      if(wasHidden) menu.classList.remove('hidden');
    });
  });

  container.querySelectorAll('.row-menu button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      closeAllRowMenus();
      if(btn.dataset.action === 'edit') openLinkModal(id);
      else if(btn.dataset.action === 'delete') confirmDeleteLink(id);
    });
  });

  container.querySelectorAll('.add-to-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => openLinkModal(null, btn.dataset.cat));
  });
}

function closeAllRowMenus(){
  document.querySelectorAll('.row-menu').forEach(m => m.classList.add('hidden'));
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

function populateCategorySelect(selectedId){
  const select = document.getElementById('linkCategory');
  select.innerHTML = state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if(selectedId) select.value = selectedId;
}

function openLinkModal(id, presetCategoryId){
  closeAllRowMenus();
  document.getElementById('linkModalTitle').textContent = id ? 'Linki Düzenle' : 'Yeni Link';
  document.getElementById('linkId').value = id || '';

  if(id){
    const l = state.links.find(x => x.id === id);
    document.getElementById('linkName').value = l.name;
    document.getElementById('linkUrl').value = l.url;
    document.getElementById('linkEmoji').value = l.emoji || '';
    populateCategorySelect(l.categoryId);
  }else{
    linkForm.reset();
    populateCategorySelect(presetCategoryId || state.categories[0]?.id);
  }
  linkModalOverlay.classList.remove('hidden');
  setTimeout(() => document.getElementById('linkName').focus(), 50);
}

function closeLinkModal(){ linkModalOverlay.classList.add('hidden'); }

document.getElementById('addLinkBtn').addEventListener('click', () => {
  if(state.categories.length === 0){
    showToast('Önce bir başlık oluştur.');
    openCategoryModal();
    return;
  }
  openLinkModal(null);
});
document.getElementById('emptyAddBtn').addEventListener('click', () => {
  if(state.categories.length === 0){
    openCategoryModal();
    return;
  }
  openLinkModal(null);
});
document.getElementById('linkModalClose').addEventListener('click', closeLinkModal);
document.getElementById('linkCancelBtn').addEventListener('click', closeLinkModal);
linkModalOverlay.addEventListener('click', (e) => { if(e.target === linkModalOverlay) closeLinkModal(); });

document.getElementById('newCategoryInline').addEventListener('click', () => {
  const name = prompt('Yeni başlık adı:');
  if(!name || !name.trim()) return;
  const cat = { id: uid(), name: name.trim() };
  state.categories.push(cat);
  saveState();
  populateCategorySelect(cat.id);
});

linkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('linkId').value;
  const name = document.getElementById('linkName').value.trim();
  const url = normalizeUrl(document.getElementById('linkUrl').value.trim());
  const categoryId = document.getElementById('linkCategory').value;
  const emoji = document.getElementById('linkEmoji').value.trim();

  if(!name || !url){ showToast('Lütfen ad ve adres gir.'); return; }
  if(!categoryId){ showToast('Lütfen bir başlık seç.'); return; }

  if(id){
    const l = state.links.find(x => x.id === id);
    Object.assign(l, { name, url, categoryId, emoji });
    showToast('Link güncellendi.');
  }else{
    state.links.push({ id: uid(), name, url, categoryId, emoji, clicks: 0, createdAt: Date.now() });
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

/* ---------------- category (başlık) modal ---------------- */

const categoryModalOverlay = document.getElementById('categoryModalOverlay');

function openCategoryModal(){
  document.getElementById('menuDropdown').classList.add('hidden');
  renderCategoryList();
  categoryModalOverlay.classList.remove('hidden');
  setTimeout(() => document.getElementById('newCategoryName').focus(), 50);
}

function renderCategoryList(){
  const list = document.getElementById('categoryList');
  if(state.categories.length === 0){
    list.innerHTML = `<p class="list-empty-hint">Henüz başlık yok. Aşağıdan bir tane ekle.</p>`;
    return;
  }
  list.innerHTML = state.categories.map(c => {
    const count = state.links.filter(l => l.categoryId === c.id).length;
    return `
      <div class="category-row-item">
        <span class="cname">${escapeHtml(c.name)}</span>
        <span class="ccount">${count} link</span>
        <button data-id="${c.id}" aria-label="Başlığı sil">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;
  }).join('');

  list.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const count = state.links.filter(l => l.categoryId === id).length;
      const doDelete = () => {
        state.links = state.links.filter(l => l.categoryId !== id);
        state.categories = state.categories.filter(c => c.id !== id);
        saveState();
        renderCategoryList();
        render();
        showToast('Başlık silindi.');
      };
      if(count > 0){
        openConfirm(`Bu başlıktaki ${count} link de birlikte silinecek. Devam edilsin mi?`, doDelete);
      }else{
        doDelete();
      }
    });
  });
}

document.getElementById('manageCategoriesBtn').addEventListener('click', openCategoryModal);
document.getElementById('categoryModalClose').addEventListener('click', () => categoryModalOverlay.classList.add('hidden'));
categoryModalOverlay.addEventListener('click', (e) => { if(e.target === categoryModalOverlay) categoryModalOverlay.classList.add('hidden'); });

document.getElementById('newCategoryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('newCategoryName');
  const name = nameInput.value.trim();
  if(!name) return;
  state.categories.push({ id: uid(), name });
  saveState();
  nameInput.value = '';
  renderCategoryList();
  render();
  showToast('Başlık eklendi.');
});

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
document.addEventListener('click', () => { menuDropdown.classList.add('hidden'); closeAllRowMenus(); });

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
      if(!Array.isArray(data.links) || !Array.isArray(data.categories)) throw new Error('geçersiz format');
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
  openConfirm('Tüm başlıklar ve linkler silinecek. Emin misin?', () => {
    state = seedState();
    saveState();
    render();
    showToast('Sıfırlandı.');
  });
});

/* ---------------- keyboard shortcuts ---------------- */

document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement && document.activeElement.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if(e.key === 'Escape'){
    closeLinkModal();
    categoryModalOverlay.classList.add('hidden');
    confirmOverlay.classList.add('hidden');
    menuDropdown.classList.add('hidden');
    closeAllRowMenus();
    if(typing) document.activeElement.blur();
    return;
  }
  if(typing) return;

  if(e.key === '/'){
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }else if(e.key.toLowerCase() === 'n'){
    e.preventDefault();
    document.getElementById('addLinkBtn').click();
  }
});

/* ---------------- init ---------------- */

applyTheme();
updateClock();
setInterval(updateClock, 15000);
render();
