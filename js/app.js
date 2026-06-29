(function () {
  const state = {
    resources: [],
    filtered: [],
    activeCategory: null,
    searchQuery: '',
    currentSort: 'downloads'
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const grid = $('#resourceGrid');
  const searchInput = $('#searchInput');
  const searchBtn = $('#searchBtn');
  const clearBtn = $('#clearBtn');
  const categoryChips = $('#categoryChips');
  const resultCount = $('#resultCount');
  const totalCount = $('#totalCount');
  const sortSelect = $('#sortSelect');
  const toast = $('#toast');

  let toastTimer = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
  }

  function formatDownloads(n) {
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  const CATEGORY_LABELS = {
    'doc': '人文檔',
    'archive': '壓縮檔',
    'design': '設計資源',
    'code': '程式碼',
    'tool': '工具',
    'Other': '其他'
  };

  function getIconClass(format) {
    const key = format.toLowerCase();
    if (key === 'pdf') return 'pdf';
    if (key === 'zip' || key === 'rar' || key === '7z') return 'zip';
    if (key === 'svg') return 'svg';
    if (key === 'fbx') return 'fbx';
    if (key === 'figma' || key === 'fig') return 'figma';
    if (key === 'ase') return 'ase';
    if (key === 'yaml' || key === 'yml') return 'yaml';
    if (key === 'json') return 'json';
    if (key === 'js' || key === 'ts') return 'js';
    if (key === 'html' || key === 'css') return 'html';
    return 'code';
  }

  function getIconEmoji(format) {
    const map = {
      'pdf': '📄', 'zip': '📦', 'svg': '🖼️', 'fbx': '🧊',
      'figma': '🎨', 'ase': '🎨', 'yaml': '⚙️', 'json': '📋',
      'js': '🟨', 'html': '🌐'
    };
    return map[format.toLowerCase()] || '📁';
  }

  function createCard(resource) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = resource.id;

    const catLabel = CATEGORY_LABELS[resource.category] || resource.category;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-icon ${getIconClass(resource.format)}">${getIconEmoji(resource.format)}</div>
        <span class="card-category">${catLabel}</span>
      </div>
      <div class="card-title">${resource.title}</div>
      <div class="card-desc">${resource.description}</div>
      <div class="card-meta">
        <span>📎 ${resource.format}</span>
        <span>📏 ${resource.fileSize}</span>
        <span>📅 ${formatDate(resource.dateAdded)}</span>
        <span>⬇️ ${formatDownloads(resource.downloads)}</span>
        <span>⭐ ${resource.rating}</span>
      </div>
      <div class="card-tags">
        ${resource.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
      </div>
      <div class="card-actions">
        <button class="btn btn-primary download-btn" data-url="${resource.downloadUrl}" data-title="${resource.title}">
          ⬇️ 下載
        </button>
        <button class="btn btn-outline share-btn" data-id="${resource.id}" data-title="${resource.title}">
          🔗 分享
        </button>
      </div>
    `;

    return card;
  }

  function renderCards(resources) {
    if (resources.length === 0) {
      grid.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔍</div>
          <h3>找不到相符的資源</h3>
          <p>試試其他關鍵字或清除篩選條件</p>
        </div>
      `;
      resultCount.textContent = '0 個結果';
      return;
    }

    const fragment = document.createDocumentFragment();
    resources.forEach(r => fragment.appendChild(createCard(r)));
    grid.innerHTML = '';
    grid.appendChild(fragment);
    resultCount.textContent = `${resources.length} 個結果`;

    attachCardEvents();
  }

  function attachCardEvents() {
    grid.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const url = this.dataset.url;
        const title = this.dataset.title;
        window.open(url, '_blank', 'noopener,noreferrer');
        showToast(`⬇️ 正在開啟 ${title} 的下載連結`);
      });
    });

    grid.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const id = this.dataset.id;
        const title = this.dataset.title;
        const shareUrl = `${window.location.origin}${window.location.pathname}?r=${id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast(`🔗 已複製「${title}」的分享連結`);
        }).catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = shareUrl;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast(`🔗 已複製「${title}」的分享連結`);
        });
      });
    });
  }

  function filterAndSort() {
    let result = state.resources;

    if (state.activeCategory) {
      result = result.filter(r => r.category === state.activeCategory);
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.trim().toLowerCase();
      result = result.filter(r => {
        return r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some(t => t.toLowerCase().includes(q)) ||
          r.category.toLowerCase().includes(q) ||
          r.format.toLowerCase().includes(q);
      });
    }

    switch (state.currentSort) {
      case 'downloads':
        result.sort((a, b) => b.downloads - a.downloads);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'date':
        result.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'));
        break;
    }

    state.filtered = result;
    renderCards(result);
  }

  function setCategory(category) {
    state.activeCategory = category;
    $$('.chip').forEach(el => {
      el.classList.toggle('active', el.dataset.category === category);
    });
    filterAndSort();
  }

  function renderCategories() {
    const categories = [...new Set(state.resources.map(r => r.category))];
    const chips = document.createDocumentFragment();

    const all = document.createElement('button');
    all.className = 'chip' + (state.activeCategory === null ? ' active' : '');
    all.dataset.category = '';
    all.textContent = '🏷️ 全部';
    all.addEventListener('click', () => setCategory(null));
    chips.appendChild(all);

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.dataset.category = cat;
      chip.textContent = cat;
      chip.addEventListener('click', () => setCategory(cat));
      chips.appendChild(chip);
    });

    categoryChips.innerHTML = '';
    categoryChips.appendChild(chips);
  }

  function initSort() {
    sortSelect.addEventListener('change', function () {
      state.currentSort = this.value;
      filterAndSort();
    });
    state.currentSort = sortSelect.value;
  }

  function initSearch() {
    function doSearch() {
      state.searchQuery = searchInput.value;
      clearBtn.classList.toggle('visible', searchInput.value.length > 0);
      filterAndSort();
    }

    searchInput.addEventListener('input', doSearch);
    searchBtn.addEventListener('click', doSearch);

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doSearch();
    });

    clearBtn.addEventListener('click', function () {
      searchInput.value = '';
      clearBtn.classList.remove('visible');
      state.searchQuery = '';
      filterAndSort();
      searchInput.focus();
    });
  }

  function initTabs() {
    $$('.tab').forEach(tab => {
      tab.addEventListener('click', function () {
        const target = this.dataset.tab;
        $$('.tab').forEach(t => t.classList.remove('active'));
        $$('.tab-content').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        $(`#tab-${target}`).classList.add('active');
      });
    });
  }

  function checkUrlForShare() {
    const params = new URLSearchParams(window.location.search);
    const rId = params.get('r');
    if (rId) {
      const resource = state.resources.find(r => r.id === rId);
      if (resource) {
        setTimeout(() => {
          state.searchQuery = resource.title;
          searchInput.value = resource.title;
          clearBtn.classList.add('visible');
          state.activeCategory = null;
          $$('.chip').forEach(el => el.classList.remove('active'));
          filterAndSort();
          const card = grid.querySelector(`.card[data-id="${rId}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.borderColor = '#6366f1';
            card.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.3)';
          }
          showToast(`🔗 正在查看分享的資源：「${resource.title}」`);
        }, 300);
      }
    }
  }

  function init() {
    grid.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>載入資源中...</p>
      </div>
    `;

    fetch('data/resources.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        state.resources = data;
        totalCount.textContent = data.length;
        renderCategories();
        filterAndSort();
        checkUrlForShare();
      })
      .catch(err => {
        grid.innerHTML = `
          <div class="empty">
            <div class="empty-icon">⚠️</div>
            <h3>載入失敗</h3>
            <p>無法讀取資源資料，請確認 data/resources.json 存在且格式正確。</p>
          </div>
        `;
        console.error('Failed to load resources:', err);
      });

    initSearch();
    initSort();
    initTabs();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
