/* ==========================================================================
   kısayol — sık kullanılanlar sayfası
   Saf JavaScript, veriler tarayıcının localStorage'ında saklanır.
   ========================================================================== */

const STORAGE_KEY = 'kisayol.v3';

const DEFAULT_CATEGORIES = [];
const DEFAULT_LINKS = [];

function uid(){ return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      return {
        theme: parsed.theme || null,
        categories: Array.isArray(parsed.categories) ? parsed.categories.filter(c => c && c.id && c.name) : [],
        links: Array.isArray(parsed.links) ? parsed.links.filter(l => l && l.id && l.name && l.url) : []
      };
    }
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

function renderRow(link){
  const domain = getDomain(normalizeUrl(link.url));
  return `
    <div class="link-row" data-id="${link.id}" role="button" tabindex="0" title="${escapeHtml(link.name)}">
      ${faviconMarkup(link)}
      <span class="row-body">
        <span class="row-name">${escapeHtml(link.name)}</span>
        <span class="row-domain">${escapeHtml(domain)}</span>
      </span>
      <button class="row-menu-btn" data-id="${link.id}" aria-label="Seçenekler">
        <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>
      </button>
      <div class="row-menu hidden" data-menu="${link.id}">
        <button data-action="edit" data-id="${link.id}">Düzenle</button>
        <button data-action="delete" data-id="${link.id}" class="danger">Sil</button>
      </div>
    </div>`;
}

function catMenuMarkup(id){
  return `
    <button class="cat-menu-btn" data-cat="${id}" aria-label="Başlık seçenekleri">
      <svg viewBox="0 0 24 24" fill="none"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>
    </button>
    <div class="cat-menu hidden" data-catmenu="${id}">
      <button data-action="edit-cat" data-id="${id}">Düzenle</button>
      <button data-action="delete-cat" data-id="${id}" class="danger">Sil</button>
    </div>`;
}

function renderSection(section){
  const rowsHtml = section.links.map(l => renderRow(l)).join('');
  const subs = section.subs || [];
  const emptyHint = (section.links.length === 0 && subs.length === 0)
    ? `<p class="list-empty-hint">Bu başlıkta henüz link yok.</p>` : '';
  const addBtn = `<button class="add-to-cat-btn" data-cat="${section.id}">+ link ekle</button>`;

  const subsHtml = subs.map(sub => {
    const subRows = sub.links.map(l => renderRow(l)).join('');
    const subEmptyHint = sub.links.length === 0
      ? `<p class="list-empty-hint">Bu alt başlıkta henüz link yok.</p>` : '';
    return `
      <div class="subcategory" data-cat="${sub.id}">
        <div class="subsection-heading">
          ${catMenuMarkup(sub.id)}
          <h4>${escapeHtml(sub.name)}</h4>
          <button class="add-to-cat-btn" data-cat="${sub.id}">+ link ekle</button>
        </div>
        ${sub.links.length > 0 ? `<div class="link-list">${subRows}</div>` : ''}
        ${subEmptyHint}
      </div>`;
  }).join('');

  return `
    <section class="category-section" data-cat="${section.id}">
      <div class="section-heading">
        ${catMenuMarkup(section.id)}
        <h3>${escapeHtml(section.name)}</h3>
        ${addBtn}
      </div>
      ${section.links.length > 0 ? `<div class="link-list">${rowsHtml}</div>` : ''}
      ${emptyHint}
      ${subsHtml}
    </section>`;
}

function render(){
  const container = document.getElementById('categoriesContainer');
  const empty = document.getElementById('emptyState');
  const emptyTitle = document.querySelector('.empty-title');
  const emptySub = document.querySelector('.empty-sub');
  const query = document.getElementById('searchInput').value.trim().toLowerCase();

  const matches = (l) => !query || l.name.toLowerCase().includes(query) || getDomain(normalizeUrl(l.url)).toLowerCase().includes(query);

  const sections = [];
  const topCategories = state.categories.filter(c => !c.parentId);
  topCategories.forEach(cat => {
    const links = state.links.filter(l => l.categoryId === cat.id).filter(matches);
    const subs = state.categories
      .filter(sc => sc.parentId === cat.id)
      .map(sc => ({ id: sc.id, name: sc.name, links: state.links.filter(l => l.categoryId === sc.id).filter(matches) }))
      .filter(sub => !query || sub.links.length);
    const hasAnything = links.length > 0 || subs.some(s => s.links.length > 0);
    if(!query || hasAnything) sections.push({ id: cat.id, name: cat.name, special: false, links, subs });
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
      const link = state.links.find(l => l.id === row.dataset.id);
      if(!link) return;
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

  container.querySelectorAll('.cat-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = container.querySelector(`.cat-menu[data-catmenu="${btn.dataset.cat}"]`);
      const wasHidden = menu.classList.contains('hidden');
      closeAllRowMenus();
      closeAllCatMenus();
      if(wasHidden) menu.classList.remove('hidden');
    });
  });

  container.querySelectorAll('.cat-menu button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      closeAllCatMenus();
      if(btn.dataset.action === 'edit-cat') renameCategory(id);
      else if(btn.dataset.action === 'delete-cat') deleteCategoryCascade(id);
    });
  });
}

function closeAllRowMenus(){
  document.querySelectorAll('.row-menu').forEach(m => m.classList.add('hidden'));
}

function closeAllCatMenus(){
  document.querySelectorAll('.cat-menu').forEach(m => m.classList.add('hidden'));
}

let renameTargetId = null;
const renameModalOverlay = document.getElementById('renameModalOverlay');
const renameForm = document.getElementById('renameForm');
const renameInput = document.getElementById('renameInput');

function renameCategory(id){
  const cat = categoryById(id);
  if(!cat) return;
  renameTargetId = id;
  renameInput.value = cat.name;
  renameModalOverlay.classList.remove('hidden');
  setTimeout(() => { renameInput.focus(); renameInput.select(); }, 50);
}

function closeRenameModal(){
  renameModalOverlay.classList.add('hidden');
  renameTargetId = null;
}

document.getElementById('renameModalClose').addEventListener('click', closeRenameModal);
document.getElementById('renameCancelBtn').addEventListener('click', closeRenameModal);
renameModalOverlay.addEventListener('click', (e) => { if(e.target === renameModalOverlay) closeRenameModal(); });

renameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = renameInput.value.trim();
  const cat = renameTargetId && categoryById(renameTargetId);
  if(!name || !cat) return;
  cat.name = name;
  saveState();
  closeRenameModal();
  render();
  showToast('Başlık güncellendi.');
});

/* ---------------- search ---------------- */

document.getElementById('searchInput').addEventListener('input', render);

/* ---------------- link modal (add/edit) ---------------- */

const linkModalOverlay = document.getElementById('linkModalOverlay');
const linkForm = document.getElementById('linkForm');

function populateCategorySelect(selectedId){
  const select = document.getElementById('linkCategory');
  const topCats = state.categories.filter(c => !c.parentId);
  select.innerHTML = topCats.map(c => {
    const subOptions = state.categories
      .filter(sc => sc.parentId === c.id)
      .map(sc => `<option value="${sc.id}">&nbsp;&nbsp;↳ ${escapeHtml(sc.name)}</option>`)
      .join('');
    return `<option value="${c.id}">${escapeHtml(c.name)}</option>${subOptions}`;
  }).join('');
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
  setTimeout(() => document.getElementById('linkUrl').focus(), 50);
}

function closeLinkModal(){ linkModalOverlay.classList.add('hidden'); }

document.getElementById('addCategoryBtn').addEventListener('click', () => openCategoryModal());
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
  const url = normalizeUrl(document.getElementById('linkUrl').value.trim());
  const rawName = document.getElementById('linkName').value.trim();
  const categoryId = document.getElementById('linkCategory').value;
  const emoji = document.getElementById('linkEmoji').value.trim();

  if(!url){ showToast('Lütfen bir adres gir.'); return; }
  if(!categoryId){ showToast('Lütfen bir başlık seç.'); return; }
  const name = rawName || getDomain(url);

  if(id){
    const l = state.links.find(x => x.id === id);
    Object.assign(l, { name, url, categoryId, emoji });
    showToast('Link güncellendi.');
  }else{
    state.links.push({ id: uid(), name, url, categoryId, emoji, createdAt: Date.now() });
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

function deleteCategoryCascade(id){
  const cat = categoryById(id);
  if(!cat) return;
  const isTop = !cat.parentId;
  const subIds = isTop ? state.categories.filter(c => c.parentId === id).map(c => c.id) : [];
  const allIds = [id, ...subIds];
  const linkCount = state.links.filter(l => allIds.includes(l.categoryId)).length;

  const doDelete = () => {
    state.links = state.links.filter(l => !allIds.includes(l.categoryId));
    state.categories = state.categories.filter(c => !allIds.includes(c.id));
    saveState();
    renderCategoryList();
    render();
    showToast('Başlık silindi.');
  };

  if(subIds.length > 0){
    openConfirm(`Bu başlık ve ${subIds.length} alt başlığındaki toplam ${linkCount} link silinecek. Devam edilsin mi?`, doDelete);
  }else if(linkCount > 0){
    openConfirm(`Bu başlıktaki ${linkCount} link de birlikte silinecek. Devam edilsin mi?`, doDelete);
  }else{
    doDelete();
  }
}

function populateParentSelect(){
  const select = document.getElementById('newCategoryParent');
  if(!select) return;
  const topCats = state.categories.filter(c => !c.parentId);
  select.innerHTML = `<option value="">— Ana başlık —</option>` +
    topCats.map(c => `<option value="${c.id}">${escapeHtml(c.name)} altına alt başlık</option>`).join('');
}

function renderCategoryList(){
  const list = document.getElementById('categoryList');
  const topCats = state.categories.filter(c => !c.parentId);

  if(topCats.length === 0){
    list.innerHTML = `<p class="list-empty-hint">Henüz başlık yok. Aşağıdan bir tane ekle.</p>`;
  }else{
    list.innerHTML = topCats.map(c => {
      const directCount = state.links.filter(l => l.categoryId === c.id).length;
      const subCats = state.categories.filter(sc => sc.parentId === c.id);
      const subRows = subCats.map(sc => {
        const subCount = state.links.filter(l => l.categoryId === sc.id).length;
        return `
          <div class="category-row-item sub">
            <span class="cname">↳ ${escapeHtml(sc.name)}</span>
            <span class="ccount">${subCount} link</span>
            <button data-id="${sc.id}" aria-label="Alt başlığı sil">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>`;
      }).join('');
      return `
        <div class="category-group">
          <div class="category-row-item">
            <span class="cname">${escapeHtml(c.name)}</span>
            <span class="ccount">${directCount} link</span>
            <button class="add-sub-btn" data-parent="${c.id}">+ alt başlık</button>
            <button data-id="${c.id}" aria-label="Başlığı sil">
              <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-1 13a1 1 0 01-1 1H8a1 1 0 01-1-1L6 7h12z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
          ${subRows}
        </div>`;
    }).join('');
  }

  list.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => deleteCategoryCascade(btn.dataset.id));
  });

  list.querySelectorAll('.add-sub-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentSelect = document.getElementById('newCategoryParent');
      const nameInput = document.getElementById('newCategoryName');
      parentSelect.value = btn.dataset.parent;
      nameInput.focus();
    });
  });

  populateParentSelect();
}

document.getElementById('manageCategoriesBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  openCategoryModal();
});
document.getElementById('categoryModalClose').addEventListener('click', () => categoryModalOverlay.classList.add('hidden'));
categoryModalOverlay.addEventListener('click', (e) => { if(e.target === categoryModalOverlay) categoryModalOverlay.classList.add('hidden'); });

document.getElementById('newCategoryForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('newCategoryName');
  const parentSelect = document.getElementById('newCategoryParent');
  const name = nameInput.value.trim();
  if(!name) return;
  const parentId = parentSelect.value || null;
  state.categories.push({ id: uid(), name, parentId });
  saveState();
  nameInput.value = '';
  parentSelect.value = '';
  renderCategoryList();
  render();
  showToast(parentId ? 'Alt başlık eklendi.' : 'Başlık eklendi.');
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
document.addEventListener('click', () => { menuDropdown.classList.add('hidden'); closeAllRowMenus(); closeAllCatMenus(); });

document.getElementById('resetBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  menuDropdown.classList.add('hidden');
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
    closeRenameModal();
    categoryModalOverlay.classList.add('hidden');
    confirmOverlay.classList.add('hidden');
    menuDropdown.classList.add('hidden');
    closeAllRowMenus();
    closeAllCatMenus();
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
