/* ==========================================================================
   Android Money Manager App - Account Management & Balance Engine Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Update Android Status Bar Time
  function updateTime() {
    const statusTime = document.getElementById('statusTime');
    if (statusTime) {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes();
      minutes = minutes < 10 ? '0' + minutes : minutes;
      hours = hours < 10 ? '0' + hours : hours;
      statusTime.textContent = `${hours}:${minutes}`;
    }
  }
  updateTime();
  setInterval(updateTime, 30000);

  // --- REDESIGNED ACCOUNTS CONTAINER DATA MODEL (4 DROPDOWN CATEGORIES) ---
  let currentDropdownCategory = "wallets"; // "wallets", "bank_debit", "living_budget", "custom"
  let activeSubAccountIndex = 0;
  let isBalanceMasked = false;
  let tooltipTimeoutId = null;

  let subAccountsData = {
    wallets: [
      { id: "w1", title: "Main Cash Wallet", icon: "wallet", active: true, order: 0, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Primary Liquid Cash" },
      { id: "w2", title: "Budget for Wallet", icon: "pie-chart", active: true, order: 1, spent: 0.00, limit: 50000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Spent Allocation" },
      { id: "w3", title: "Loans (Cash Borrowed)", icon: "circle-dollar-sign", active: true, order: 2, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Borrowed Cash Outstanding" },
      { id: "w4", title: "Someone's Money", icon: "users", active: true, order: 3, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Third-Party Held Cash" },
      { id: "w5", title: "Custom Sub-Wallet", icon: "sliders", active: false, order: 4, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Emergency Cash Vault" }
    ],
    bank_debit: [
      { id: "b1", title: "Commercial Bank Savings", icon: "landmark", active: true, order: 0, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Primary Bank Account" },
      { id: "b2", title: "Debit Cards", icon: "credit-card", active: true, order: 1, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Linked Debit Account" },
      { id: "b3", title: "Credit Cards", icon: "credit-card", active: true, order: 2, limit: 100000.00, spent: 0.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Credit Line Used" },
      { id: "b4", title: "Card/Bank Budget", icon: "pie-chart", active: true, order: 3, spent: 0.00, limit: 50000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Digital Spending Allocation" },
      { id: "b5", title: "Loans", icon: "circle-dollar-sign", active: false, order: 4, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Bank Loan Balance" },
      { id: "b6", title: "Someone's Money", icon: "users", active: false, order: 5, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Escrow Bank Deposit" },
      { id: "b7", title: "Custom Sub-Account", icon: "sliders", active: false, order: 6, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "High-Yield Vault" }
    ],
    topup_wallet: [
      { id: "t1", title: "Transit Card", icon: "bus", active: true, order: 0, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Metro/Bus Wallet" }
    ],
    living_budget: [
      { id: "lb1", title: "Wallet Budget", icon: "wallet", active: true, order: 0, spent: 0.00, limit: 50000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Cash Living Expense" },
      { id: "lb2", title: "Bank/Debit Budget", icon: "landmark", active: true, order: 1, spent: 0.00, limit: 100000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Direct Debit Utilities" },
      { id: "lb3", title: "Credit Card Budget", icon: "credit-card", active: true, order: 2, spent: 0.00, limit: 50000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Card Living Spend" },
      { id: "lb4", title: "Loans Budget", icon: "circle-dollar-sign", active: false, order: 3, spent: 0.00, limit: 75000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Debt Repayment Allowance" },
      { id: "lb5", title: "Custom Time-Range Budget", icon: "calendar", active: true, order: 4, type: "time_range", categoryOption: "Tracking Wallet", activeRange: "1 Month", ranges: { "1 Month": { spent: 0.00, limit: 200000.00 }, "Multi-Month": { spent: 0.00, limit: 600000.00 }, "1 Year": { spent: 0.00, limit: 2400000.00 } } }
    ],
    custom: [
      { id: "c1", title: "Vault & Emergency Reserve", icon: "sliders", active: true, order: 0, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Yield: 11.5% p.a." },
      { id: "c2", title: "Investment Reserve Goal", icon: "pie-chart", active: true, order: 1, spent: 0.00, limit: 1000000.00, type: "progress", categoryOption: "Tracking Wallet", subtitle: "Goal Allocation" },
      { id: "c3", title: "Secondary Savings Sub-Vault", icon: "wallet", active: false, order: 2, balance: 0.00, type: "basic", categoryOption: "Basic Wallet", subtitle: "Fixed Deposit Reserve" }
    ]
  };

  const catIconMap = {
    wallets: "wallet",
    bank_debit: "credit-card",
    topup_wallet: "bus",
    living_budget: "pie-chart",
    custom: "sliders"
  };

  const DEFAULT_CAT_ORDER = ["wallets", "bank_debit", "topup_wallet", "living_budget", "custom"];
  const PROTECTED_CATEGORIES = ["wallets", "bank_debit", "topup_wallet"];
  let categoryOrder = [...DEFAULT_CAT_ORDER];

  const AVAILABLE_ICONS = [
    { name: 'wallet', title: 'Wallet' },
    { name: 'credit-card', title: 'Card' },
    { name: 'landmark', title: 'Bank' },
    { name: 'coins', title: 'Coins' },
    { name: 'banknote', title: 'Cash' },
    { name: 'pie-chart', title: 'Budget' },
    { name: 'shopping-bag', title: 'Shopping' },
    { name: 'shopping-cart', title: 'Cart' },
    { name: 'coffee', title: 'Coffee' },
    { name: 'utensils', title: 'Dining' },
    { name: 'car', title: 'Vehicle' },
    { name: 'bus', title: 'Transit' },
    { name: 'home', title: 'Home' },
    { name: 'plane', title: 'Travel' },
    { name: 'heart', title: 'Health' },
    { name: 'gift', title: 'Gift' },
    { name: 'phone', title: 'Mobile' },
    { name: 'tv', title: 'Entertainment' },
    { name: 'shield', title: 'Insurance' },
    { name: 'sliders', title: 'Custom' }
  ];

  function setupIconSelector(containerId, initialIcon, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    AVAILABLE_ICONS.forEach(({ name, title }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `wallet-icon-option ${name === initialIcon ? 'active' : ''}`;
      btn.setAttribute('data-icon', name);
      btn.title = title;
      btn.innerHTML = `<i data-lucide="${name}"></i>`;
      container.appendChild(btn);
    });

    container.onclick = (e) => {
      const btn = e.target.closest('.wallet-icon-option');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      container.querySelectorAll('.wallet-icon-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const chosen = btn.getAttribute('data-icon') || 'wallet';
      if (onChange) onChange(chosen);
    };

    if (window.lucide) lucide.createIcons();
  }

  // --- LOCALIZATION & LANGUAGE ENGINE (ENGLISH, SI, SINGLISH) ---
  let currentLang = "en";

  const langNames = {
    en: "English",
    si: "සින්හල",
    singlish: "සින්ග්ලිශ්"
  };

  const translations = {
    en: {
      wallets: "Wallets",
      bank_debit: "Bank Accounts & Debit Cards",
      living_budget: "Living Budget",
      custom: "Custom",
      topup_wallet: "Top-up Wallet",
      profile_title: "Profile & Preferences",
      profile_subtitle: "Account settings & language options",
      dark_mode: "Dark Theme",
      dark_mode_sub: "Toggle dark aesthetic mode",
      change_language: "Change Language",
      select_language_title: "Select Language",
      select_language_sub: "Choose your preferred app display language:",
      done_btn: "Done",
      add_account: "Add New Wallet",
      switch_accounts: "Switch Accounts"
    },
    si: {
      wallets: "පසුම්බිය",
      bank_debit: "බැංකු ගිණුම් සහ කාඩ්පත්",
      living_budget: "ජීවන අයවැය",
      custom: "වෙනත්",
      topup_wallet: "ටොප්-අප් පසුම්බිය",
      profile_title: "පරිශීලක සැකසීම්",
      profile_subtitle: "ගිණුම් සැකසීම් සහ භාෂා තේරීම්",
      dark_mode: "අඳුරු තේමාව",
      dark_mode_sub: "අඳුරු තේමාව සක්‍රිය කරන්න",
      change_language: "භාෂාව වෙනස් කරන්න",
      select_language_title: "භාෂාව තෝරන්න",
      select_language_sub: "ඔබට අවශ්‍ය ප්‍රකාශන භාෂාව තෝරන්න:",
      done_btn: "තහවුරු කරන්න",
      add_account: "නව පසුම්බියක් එක්කරන්න",
      switch_accounts: "ගිණුම මාරු කරන්න"
    },
    singlish: {
      wallets: "පර්ස් එක",
      bank_debit: "බෑන්ක් ඇකවුන්ට්ස් & කාඩ්ස්",
      living_budget: "ලිවින් බජට් එක",
      custom: "කස්ටම්",
      topup_wallet: "Top-up Wallet",
      profile_title: "ප්‍රොෆයිල් සෙටින්ග්ස්",
      profile_subtitle: "ඇකවුන්ට් සෙටින්ග්ස් & ලැන්වේජ් ඔප්ෂන්ස්",
      dark_mode: "ඩාර්ක් තීම් එක",
      dark_mode_sub: "ඩාර්ක් මෝඩ් ඔන් කරන්න",
      change_language: "ලැන්වේජ් එක චේන්ජ් කරන්න",
      select_language_title: "ලැන්වේජ් එක සිලෙක්ට් කරන්න",
      select_language_sub: "ඔයාට ඕන ලැන්වේජ් ඔප්ෂන් එක තෝරන්න:",
      done_btn: "ඩන්",
      add_account: "නිව් වොලට් ඇඩ් කරන්න",
      switch_accounts: "චේන්ජ් ඇකවුන්ට්ස්"
    }
  };

  let categoryTitlesMap = {
    wallets: "Wallets",
    bank_debit: "Bank Accounts & Debit Cards",
    topup_wallet: "Top-up Wallet",
    living_budget: "Living Budget",
    custom: "Custom"
  };

  function saveAccountsState() {
    try {
      localStorage.setItem('appSubAccountsData', JSON.stringify(subAccountsData));
      localStorage.setItem('appCategoryTitles', JSON.stringify(categoryTitlesMap));
      localStorage.setItem('appCatIcons', JSON.stringify(catIconMap));
      localStorage.setItem('appCategoryOrder', JSON.stringify(categoryOrder));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  function loadAccountsState() {
    try {
      const savedData = localStorage.getItem('appSubAccountsData');
      const savedTitles = localStorage.getItem('appCategoryTitles');
      const savedIcons = localStorage.getItem('appCatIcons');
      const savedOrder = localStorage.getItem('appCategoryOrder');
      if (savedData) subAccountsData = JSON.parse(savedData);
      if (savedTitles) Object.assign(categoryTitlesMap, JSON.parse(savedTitles));
      if (savedIcons) Object.assign(catIconMap, JSON.parse(savedIcons));
      if (savedOrder) {
        categoryOrder = JSON.parse(savedOrder);
      } else {
        categoryOrder = [...DEFAULT_CAT_ORDER];
      }
    } catch (e) {
      console.warn('Could not load from localStorage', e);
    }
  }
  loadAccountsState();

  function applyLanguage(lang) {
    currentLang = lang;
    const t = translations[lang] || translations.en;

    categoryTitlesMap.wallets = t.wallets;
    categoryTitlesMap.bank_debit = t.bank_debit;
    categoryTitlesMap.living_budget = t.living_budget;
    categoryTitlesMap.custom = t.custom;
    categoryTitlesMap.topup_wallet = t.topup_wallet;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });

    const activeLangBadge = document.getElementById('activeLangBadge');
    const activeLangSubtext = document.getElementById('activeLangSubtext');
    if (activeLangBadge) activeLangBadge.textContent = langNames[lang];
    if (activeLangSubtext) activeLangSubtext.textContent = `${langNames[lang]} (${lang === 'en' ? 'Default' : 'Active'})`;

    const dropdownCategoryTitle = document.getElementById('dropdownCategoryTitle');
    if (dropdownCategoryTitle) dropdownCategoryTitle.textContent = categoryTitlesMap[currentDropdownCategory] || t.wallets;

    renderCategoryDropdownMenu();
    renderSubAccountCarousel();
  }

  // Cache UI Elements Safely
  const accountCategoryDropdownBtn = document.getElementById('accountCategoryDropdownBtn');
  const dropdownCategoryTitle = document.getElementById('dropdownCategoryTitle');
  const accountCategoryDropdownMenu = document.getElementById('accountCategoryDropdownMenu');
  const infoBubbleBtn = document.getElementById('infoBubbleBtn');
  const infoTooltip = document.getElementById('infoTooltip');
  const maskToggleBtn = document.getElementById('maskToggleBtn');
  const cardCarouselSurface = document.getElementById('cardCarouselSurface');
  const accountCardDots = document.getElementById('accountCardDots');
  const editAccountsBtn = document.getElementById('editAccountsBtn');
  const switchAccountsBtn = document.getElementById('switchAccountsBtn');
  const addAccountBtn = document.getElementById('addAccountBtn');

  // Modals Cache
  const globalAccountsModal = document.getElementById('globalAccountsModal');
  const closeGlobalModal = document.getElementById('closeGlobalModal');
  const globalAccountsModalBody = document.getElementById('globalAccountsModalBody');
  const saveGlobalAccountsBtn = document.getElementById('saveGlobalAccountsBtn');

  const subAccountSettingsModal = document.getElementById('subAccountSettingsModal');
  const closeSubAccSettingsModal = document.getElementById('closeSubAccSettingsModal');
  const subAccountSettingsForm = document.getElementById('subAccountSettingsForm');

  const switchAccountsModal = document.getElementById('switchAccountsModal');
  const closeSwitchModal = document.getElementById('closeSwitchModal');
  const switchAccountsModalBody = document.getElementById('switchAccountsModalBody');
  const saveVisibilityBtn = document.getElementById('saveVisibilityBtn');

  const addAccountModal = document.getElementById('addAccountModal');
  const closeAddModal = document.getElementById('closeAddModal');
  const newAccountForm = document.getElementById('newAccountForm');

  // --- 1. MAIN ACCOUNT DROPDOWN SELECTOR LOGIC ---
  if (accountCategoryDropdownBtn && accountCategoryDropdownMenu) {
    accountCategoryDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      accountCategoryDropdownBtn.classList.toggle('open');
      accountCategoryDropdownMenu.classList.toggle('open');
      document.querySelectorAll('.dropdown-item-wrapper').forEach(w => {
        w.classList.remove('swiped');
        const it = w.querySelector('.dropdown-menu-item');
        if (it) it.style.transform = '';
      });
    });

    renderCategoryDropdownMenu();

    // Close wallet category dropdown when clicking anywhere outside
    document.addEventListener('click', (e) => {
      if (!accountCategoryDropdownBtn.contains(e.target) && !accountCategoryDropdownMenu.contains(e.target)) {
        accountCategoryDropdownBtn.classList.remove('open');
        accountCategoryDropdownMenu.classList.remove('open');
      }
    });
  }

  // --- 2. INFORMATION / HINT BUBBLE TOOLTIP ---
  if (infoBubbleBtn && infoTooltip) {
    infoBubbleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      infoTooltip.classList.toggle('visible');
    });

    document.addEventListener('click', (e) => {
      if (!infoBubbleBtn.contains(e.target) && !infoTooltip.contains(e.target)) {
        infoTooltip.classList.remove('visible');
      }
    });
  }

  // --- 3. EYE PRIVACY / BALANCE MASKING ENGINE ---
  if (maskToggleBtn) {
    maskToggleBtn.addEventListener('click', () => {
      isBalanceMasked = !isBalanceMasked;
      const eyeIcon = maskToggleBtn.querySelector('i');
      if (eyeIcon) {
        eyeIcon.setAttribute('data-lucide', isBalanceMasked ? 'eye-off' : 'eye');
        if (window.lucide) lucide.createIcons();
      }
      renderSubAccountCarousel();
    });
  }

  // Helper function to format currency
  function formatMoney(amount) {
    if (isBalanceMasked) return "••••••";
    return "LKR " + (parseFloat(amount) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function getActiveSubAccounts() {
    const list = subAccountsData[currentDropdownCategory] || [];
    const activeList = list.filter(sub => sub.active !== false).sort((a, b) => a.order - b.order);
    return activeList.length > 0 ? activeList : list.slice(0, 1);
  }

  // --- 4. SUB-ACCOUNT CAROUSEL RENDERING ENGINE ---
  function renderSubAccountCarousel() {
    if (!cardCarouselSurface || !accountCardDots) return;

    cardCarouselSurface.innerHTML = '';
    accountCardDots.innerHTML = '';

    const activeSubAccounts = getActiveSubAccounts();
    if (activeSubAccounts.length === 0) {
      const track = document.createElement('div');
      track.className = 'carousel-track';
      track.id = 'carouselTrack';

      const emptyCard = document.createElement('div');
      emptyCard.className = 'empty-card-view';
      emptyCard.innerHTML = `
        <div class="empty-card-inner open-add-sub-trigger">
          <div class="empty-plus-circle">
            <i data-lucide="plus"></i>
          </div>
          <h4 class="empty-card-title">Add Sub-Wallet</h4>
          <p class="empty-card-sub">Tap + to create a sub-wallet under ${categoryTitlesMap[currentDropdownCategory] || 'Wallet'}</p>
        </div>
      `;
      track.appendChild(emptyCard);
      cardCarouselSurface.appendChild(track);

      emptyCard.querySelector('.open-add-sub-trigger')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCreateSubAccountModal();
      });

      if (window.lucide) lucide.createIcons();
      return;
    }

    if (activeSubAccountIndex >= activeSubAccounts.length) activeSubAccountIndex = 0;

    const track = document.createElement('div');
    track.className = 'carousel-track';
    track.id = 'carouselTrack';

    activeSubAccounts.forEach((subAcc) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'account-card-view';

      let bodyContent = '';
      if (subAcc.type === 'progress' || subAcc.type === 'budget_progress' || (subAcc.limit && subAcc.limit > 0)) {
        const spentVal = subAcc.spent !== undefined ? subAcc.spent : 0;
        const limitVal = subAcc.limit || 1;
        const pct = Math.min(100, Math.round((spentVal / limitVal) * 100));
        bodyContent = `
          <div class="card-balance-header">
            <span class="balance-label-sm">${subAcc.subtitle || 'Spent Allocation'}</span>
            <div class="card-balance-display">${formatMoney(spentVal)}</div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info-row">
              <span>Limit: ${formatMoney(limitVal)}</span>
              <span>${pct}% used</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${pct > 80 ? 'warning' : ''}" style="width: ${pct}%;"></div>
            </div>
          </div>
          <div class="category-option-capsule">
            <span>Category Option:</span>
            <strong class="opt-val">${subAcc.categoryOption || 'Tracking Wallet'}</strong>
          </div>
        `;
      } else if (subAcc.type === 'time_range') {
        const currentData = subAcc.ranges[subAcc.activeRange];
        const pct = Math.min(100, Math.round((currentData.spent / currentData.limit) * 100));
        bodyContent = `
          <div class="time-range-pills">
            ${Object.keys(subAcc.ranges).map(range => `
              <button class="time-pill ${range === subAcc.activeRange ? 'active' : ''}" data-range="${range}">
                ${range}
              </button>
            `).join('')}
          </div>
          <div class="card-balance-header" style="margin-top: 4px;">
            <span class="balance-label-sm">Budget Spent (${subAcc.activeRange})</span>
            <div class="card-balance-display">${formatMoney(currentData.spent)}</div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info-row">
              <span>Limit: ${formatMoney(currentData.limit)}</span>
              <span>${pct}% used</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${pct > 80 ? 'warning' : ''}" style="width: ${pct}%;"></div>
            </div>
          </div>
          <div class="category-option-capsule">
            <span>Category Option:</span>
            <strong class="opt-val">${subAcc.categoryOption || 'Tracking Wallet'}</strong>
          </div>
        `;

        cardEl.addEventListener('click', (e) => {
          const pill = e.target.closest('.time-pill');
          if (pill) {
            e.stopPropagation();
            subAcc.activeRange = pill.getAttribute('data-range');
            renderSubAccountCarousel();
          }
        });
      } else {
        bodyContent = `
          <div class="card-balance-header">
            <span class="balance-label-sm">${subAcc.subtitle || 'Primary Liquid Cash'}</span>
            <div class="card-balance-display">${formatMoney(subAcc.balance || 0)}</div>
          </div>
          <div class="category-option-capsule">
            <span>Category Option:</span>
            <strong class="opt-val">${subAcc.categoryOption || 'Basic Wallet'}</strong>
          </div>
        `;
      }

      cardEl.innerHTML = `
        <div class="card-top-row">
          <div class="card-title-badge">
            <i data-lucide="${subAcc.icon}"></i>
            <span>${subAcc.title}</span>
            <button type="button" class="card-inline-edit open-edit-trigger" title="Edit Sub-Account">
              <i data-lucide="edit-2"></i>
            </button>
          </div>
          <button type="button" class="card-corner-add open-add-sub-trigger" title="Add Sub-Wallet">
            <i data-lucide="plus"></i>
          </button>
        </div>
        ${bodyContent}
      `;
      track.appendChild(cardEl);
    });

    cardCarouselSurface.appendChild(track);

    // Render Dot Indicators
    activeSubAccounts.forEach((_, idx) => {
      const dot = document.createElement('span');
      dot.className = `acc-dot ${idx === activeSubAccountIndex ? 'active' : ''}`;
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        activeSubAccountIndex = idx;
        updateCarouselPosition();
      });
      accountCardDots.appendChild(dot);
    });

    updateCarouselPosition();

    // Attach Edit Sub-Account trigger
    cardCarouselSurface.querySelectorAll('.open-edit-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderSubAccountSettings();
      });
    });

    // Attach Add Sub-Account trigger
    cardCarouselSurface.querySelectorAll('.open-add-sub-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openCreateSubAccountModal();
      });
    });

    setupCardSwipeGestures();
    if (window.lucide) lucide.createIcons();
  }

  function updateCarouselPosition() {
    const track = document.getElementById('carouselTrack');
    if (track) {
      track.style.transform = `translateX(-${activeSubAccountIndex * 100}%)`;
    }
    const dots = accountCardDots?.querySelectorAll('.acc-dot');
    dots?.forEach((d, i) => {
      d.classList.toggle('active', i === activeSubAccountIndex);
    });
  }

  let cardSwipeInitialized = false;
  function setupCardSwipeGestures() {
    if (!cardCarouselSurface || cardSwipeInitialized) return;
    cardSwipeInitialized = true;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isSwiping = false;

    function onStart(x, y) {
      startX = x;
      startY = y;
      currentX = x;
      currentY = y;
      isSwiping = true;
    }

    function onMove(x, y) {
      if (!isSwiping) return;
      currentX = x;
      currentY = y;
    }

    function onEnd() {
      if (!isSwiping) return;
      isSwiping = false;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      // Only respond if the swipe is predominantly horizontal and passes threshold
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 35) {
        const activeCount = getActiveSubAccounts().length;
        if (diffX < 0 && activeSubAccountIndex < activeCount - 1) {
          activeSubAccountIndex++;
          updateCarouselPosition();
        } else if (diffX > 0 && activeSubAccountIndex > 0) {
          activeSubAccountIndex--;
          updateCarouselPosition();
        }
      }
    }

    // Touch events for mobile
    cardCarouselSurface.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    cardCarouselSurface.addEventListener('touchmove', (e) => {
      if (isSwiping && e.touches.length === 1) {
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    cardCarouselSurface.addEventListener('touchend', onEnd, { passive: true });
    cardCarouselSurface.addEventListener('touchcancel', onEnd, { passive: true });

    // Mouse events for desktop
    cardCarouselSurface.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('input')) return;
      onStart(e.clientX, e.clientY);
    });
    cardCarouselSurface.addEventListener('mousemove', (e) => {
      onMove(e.clientX, e.clientY);
    });
    cardCarouselSurface.addEventListener('mouseup', onEnd);
    cardCarouselSurface.addEventListener('mouseleave', onEnd);
  }

  // --- BUTTON 1: GLOBAL ACCOUNTS MANAGER (Edit Accounts Button) ---
  if (editAccountsBtn && globalAccountsModal) {
    editAccountsBtn.addEventListener('click', () => {
      renderGlobalAccountsManager();
      globalAccountsModal.classList.add('active');
    });
  }

  closeGlobalModal?.addEventListener('click', () => {
    globalAccountsModal?.classList.remove('active');
  });

  saveGlobalAccountsBtn?.addEventListener('click', () => {
    globalAccountsModal?.classList.remove('active');
    renderCategoryDropdownMenu();
    renderSubAccountCarousel();
  });

  function renderGlobalAccountsManager() {
    if (!globalAccountsModalBody) return;
    globalAccountsModalBody.innerHTML = '';
    const catIcons = {
      wallets: "wallet",
      bank_debit: "credit-card",
      living_budget: "pie-chart",
      custom: "sliders",
      topup_wallet: "bus"
    };

    const catKeys = Object.keys(subAccountsData);

    catKeys.forEach((catKey, catIdx) => {
      const subList = subAccountsData[catKey] || [];
      const isCurrentCat = catKey === currentDropdownCategory;

      const accordion = document.createElement('div');
      accordion.className = `category-accordion ${isCurrentCat ? 'open' : ''}`;
      accordion.setAttribute('data-cat-key', catKey);

      accordion.innerHTML = `
        <div class="accordion-header">
          <div class="accordion-header-left">
            <span class="cat-drag-handle" title="Drag to reorder category"><i data-lucide="grip-vertical"></i></span>
            <i data-lucide="${catIcons[catKey] || 'folder'}"></i>
            <input type="text" class="rename-input-field cat-rename-input" data-cat="${catKey}" value="${categoryTitlesMap[catKey] || catKey}" title="Edit Main Account Title" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="visibility-count-badge">${subList.filter(s => s.active).length}/${subList.length} Active</span>
            <i data-lucide="chevron-down" class="accordion-chevron"></i>
          </div>
        </div>
        <div class="accordion-body">
          <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-bottom:4px;">Drag Handle to Reorder • Rename Inline • Toggle Visibility • Delete:</div>
          ${subList.length === 0 ? '<div style="padding:12px; text-align:center; color:var(--text-muted); font-size:0.82rem;">No sub-wallets in this category.</div>' : ''}
          ${subList.map((subAcc) => `
            <div class="acc-manage-row" draggable="true" data-id="${subAcc.id}" data-cat="${catKey}" style="padding:8px 12px; display:flex; align-items:center; gap:8px;">
              <span class="drag-handle-btn" style="cursor: grab; color: #94a3b8; padding: 4px; touch-action: none;" title="Drag to reorder"><i data-lucide="grip-vertical"></i></span>

              <div class="acc-manage-info" style="flex:1; display:flex; align-items:center; gap:8px;">
                <i data-lucide="${subAcc.icon}" style="color:${subAcc.active ? 'var(--accent-blue)' : '#64748b'}; width: 18px; height: 18px; flex-shrink: 0;"></i>
                <input type="text" class="rename-input-field sub-rename-input" data-cat="${catKey}" data-id="${subAcc.id}" value="${subAcc.title}" title="Rename Sub-Account" />
              </div>

              <button type="button" class="sub-delete-btn" data-cat="${catKey}" data-id="${subAcc.id}" title="Delete Wallet">
                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
              </button>

              <label class="toggle-switch" title="Show / Hide in Main Carousel">
                <input type="checkbox" class="global-visibility-check" data-cat="${catKey}" data-id="${subAcc.id}" ${subAcc.active ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      `;

      // 1. Accordion Toggle Click
      const headerEl = accordion.querySelector('.accordion-header');
      headerEl?.addEventListener('click', (e) => {
        if (e.target.classList.contains('cat-rename-input') || e.target.closest('.cat-drag-handle')) return;
        const isAlreadyOpen = accordion.classList.contains('open');
        globalAccountsModalBody.querySelectorAll('.category-accordion').forEach(acc => acc.classList.remove('open'));
        if (!isAlreadyOpen) accordion.classList.add('open');
      });

      // 2. Main Category Rename
      accordion.querySelector('.cat-rename-input')?.addEventListener('input', (e) => {
        const val = e.target.value;
        categoryTitlesMap[catKey] = val;
        if (catKey === currentDropdownCategory && dropdownCategoryTitle) {
          dropdownCategoryTitle.textContent = val;
        }
        renderSubAccountCarousel();
      });

      // 3. Sub-Account Rename
      accordion.querySelectorAll('.sub-rename-input').forEach(subInput => {
        subInput.addEventListener('input', (e) => {
          const sid = subInput.getAttribute('data-id');
          const targetSub = subList.find(s => s.id === sid);
          if (targetSub) {
            targetSub.title = e.target.value;
            renderSubAccountCarousel();
          }
        });
      });

      // 4. Visibility Toggle
      accordion.querySelectorAll('.global-visibility-check').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const sid = checkbox.getAttribute('data-id');
          const targetSub = subList.find(s => s.id === sid);
          if (targetSub) {
            targetSub.active = e.target.checked;
            renderSubAccountCarousel();
          }
        });
      });

      // 5. Delete Sub-Wallet Option
      accordion.querySelectorAll('.sub-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const sid = btn.getAttribute('data-id');
          const cat = btn.getAttribute('data-cat');
          if (subAccountsData[cat]) {
            subAccountsData[cat] = subAccountsData[cat].filter(s => s.id !== sid);
            renderGlobalAccountsManager();
            renderSubAccountCarousel();
          }
        });
      });

      // 6. Sub-Account Drag and Drop Reordering (Desktop + Mobile Touch)
      const accordionBody = accordion.querySelector('.accordion-body');
      const rows = accordion.querySelectorAll('.acc-manage-row');

      rows.forEach(row => {
        row.addEventListener('dragstart', (e) => {
          row.classList.add('dragging');
          e.dataTransfer.setData('text/plain', row.getAttribute('data-id'));
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          updateSubAccountOrderFromDOM(catKey, accordionBody);
        });

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          const draggingRow = accordionBody.querySelector('.dragging');
          if (draggingRow && draggingRow !== row) {
            const bounding = row.getBoundingClientRect();
            const offset = e.clientY - bounding.top - (bounding.height / 2);
            if (offset > 0) accordionBody.insertBefore(draggingRow, row.nextSibling);
            else accordionBody.insertBefore(draggingRow, row);
          }
        });

        // Mobile Touch Drag on Handle
        const dragHandle = row.querySelector('.drag-handle-btn');
        if (dragHandle) {
          let isTouchDragging = false;

          dragHandle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            isTouchDragging = true;
            row.classList.add('dragging');
          }, { passive: false });

          dragHandle.addEventListener('touchmove', (e) => {
            if (!isTouchDragging) return;
            e.preventDefault();
            e.stopPropagation();
            const currentY = e.touches[0].clientY;
            const elementUnderTouch = document.elementFromPoint(e.touches[0].clientX, currentY);
            const targetRow = elementUnderTouch?.closest('.acc-manage-row');
            if (targetRow && targetRow !== row && targetRow.parentNode === accordionBody) {
              const bounding = targetRow.getBoundingClientRect();
              const offset = currentY - bounding.top - (bounding.height / 2);
              if (offset > 0) accordionBody.insertBefore(row, targetRow.nextSibling);
              else accordionBody.insertBefore(row, targetRow);
            }
          }, { passive: false });

          dragHandle.addEventListener('touchend', (e) => {
            if (!isTouchDragging) return;
            isTouchDragging = false;
            row.classList.remove('dragging');
            updateSubAccountOrderFromDOM(catKey, accordionBody);
          });
        }
      });

      // 7. Main Category Accordion Drag and Drop Reordering
      const catDragHandle = accordion.querySelector('.cat-drag-handle');
      if (catDragHandle) {
        let isCatTouchDragging = false;
        catDragHandle.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          isCatTouchDragging = true;
          accordion.classList.add('dragging-cat');
        }, { passive: false });

        catDragHandle.addEventListener('touchmove', (e) => {
          if (!isCatTouchDragging) return;
          e.preventDefault();
          e.stopPropagation();
          const currentY = e.touches[0].clientY;
          const elementUnderTouch = document.elementFromPoint(e.touches[0].clientX, currentY);
          const targetAcc = elementUnderTouch?.closest('.category-accordion');
          if (targetAcc && targetAcc !== accordion && targetAcc.parentNode === globalAccountsModalBody) {
            const bounding = targetAcc.getBoundingClientRect();
            const offset = currentY - bounding.top - (bounding.height / 2);
            if (offset > 0) globalAccountsModalBody.insertBefore(accordion, targetAcc.nextSibling);
            else globalAccountsModalBody.insertBefore(accordion, targetAcc);
          }
        }, { passive: false });

        catDragHandle.addEventListener('touchend', (e) => {
          if (!isCatTouchDragging) return;
          isCatTouchDragging = false;
          accordion.classList.remove('dragging-cat');
          updateCategoryOrderFromDOM();
        });
      }

      globalAccountsModalBody.appendChild(accordion);
    });

    if (window.lucide) lucide.createIcons();
  }

  function updateSubAccountOrderFromDOM(catKey, accordionBody) {
    if (!accordionBody) return;
    const rows = accordionBody.querySelectorAll('.acc-manage-row');
    const subList = subAccountsData[catKey];
    if (!subList || rows.length === 0) return;

    const newSubList = [];
    rows.forEach((r, idx) => {
      const sid = r.getAttribute('data-id');
      const item = subList.find(s => s.id === sid);
      if (item) {
        item.order = idx;
        newSubList.push(item);
      }
    });

    subAccountsData[catKey] = newSubList;
    renderSubAccountCarousel();
  }

  function updateCategoryOrderFromDOM() {
    if (!globalAccountsModalBody) return;
    const accordions = globalAccountsModalBody.querySelectorAll('.category-accordion');
    const newSubAccountsData = {};
    accordions.forEach(acc => {
      const catKey = acc.getAttribute('data-cat-key');
      if (catKey && subAccountsData[catKey]) {
        newSubAccountsData[catKey] = subAccountsData[catKey];
      }
    });
    Object.keys(subAccountsData).forEach(k => {
      if (!newSubAccountsData[k]) newSubAccountsData[k] = subAccountsData[k];
    });
    subAccountsData = newSubAccountsData;
    renderCategoryDropdownMenu();
    renderSubAccountCarousel();
  }

  // --- 5. BUTTON 2: SUB-ACCOUNT SETTINGS MODAL (Scoped strictly to currently visible card) ---
  const subAccLimitToggle = document.getElementById('subAccLimitToggle');
  const subAccLimitGroup = document.getElementById('subAccLimitGroup');

  subAccLimitToggle?.addEventListener('change', (e) => {
    if (subAccLimitGroup) subAccLimitGroup.style.display = e.target.checked ? 'block' : 'none';
  });

  closeSubAccSettingsModal?.addEventListener('click', () => {
    subAccountSettingsModal?.classList.remove('active');
  });

  let selectedEditSubAccIcon = 'wallet';

  function renderSubAccountSettings() {
    const activeSubAccounts = getActiveSubAccounts();
    if (activeSubAccounts.length === 0) return;

    const activeSubAcc = activeSubAccounts[activeSubAccountIndex] || activeSubAccounts[0];
    if (!activeSubAcc) return;

    const subAccSettingsTitle = document.getElementById('subAccSettingsTitle');
    const subAccTitleInput = document.getElementById('subAccTitleInput');
    const subAccSubtitleInput = document.getElementById('subAccSubtitleInput');
    const subAccLimitInput = document.getElementById('subAccLimitInput');

    const isProgress = (activeSubAcc.type === 'progress' || activeSubAcc.type === 'budget_progress' || (activeSubAcc.limit && activeSubAcc.limit > 0));

    if (subAccSettingsTitle) subAccSettingsTitle.textContent = `Settings: ${activeSubAcc.title}`;
    if (subAccTitleInput) subAccTitleInput.value = activeSubAcc.title || '';
    if (subAccSubtitleInput) subAccSubtitleInput.value = activeSubAcc.subtitle || '';
    if (subAccLimitToggle) subAccLimitToggle.checked = isProgress;
    if (subAccLimitGroup) subAccLimitGroup.style.display = isProgress ? 'block' : 'none';
    if (subAccLimitInput) subAccLimitInput.value = activeSubAcc.limit || 50000;

    selectedEditSubAccIcon = activeSubAcc.icon || 'wallet';
    setupIconSelector('editSubAccIconSelector', selectedEditSubAccIcon, (icon) => {
      selectedEditSubAccIcon = icon;
    });

    subAccountSettingsModal?.classList.add('active');
  }

  subAccountSettingsForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const activeSubAccounts = getActiveSubAccounts();
    const activeSubAcc = activeSubAccounts[activeSubAccountIndex];
    if (activeSubAcc) {
      const subAccTitleInput = document.getElementById('subAccTitleInput');
      const subAccSubtitleInput = document.getElementById('subAccSubtitleInput');
      const subAccLimitInput = document.getElementById('subAccLimitInput');

      if (subAccTitleInput) activeSubAcc.title = subAccTitleInput.value.trim();
      if (subAccSubtitleInput) activeSubAcc.subtitle = subAccSubtitleInput.value.trim();
      activeSubAcc.icon = selectedEditSubAccIcon;

      if (subAccLimitToggle && subAccLimitToggle.checked) {
        activeSubAcc.type = 'progress';
        activeSubAcc.categoryOption = 'Tracking Wallet';
        activeSubAcc.limit = parseFloat(subAccLimitInput?.value) || 50000;
        if (activeSubAcc.spent === undefined) activeSubAcc.spent = 0.00;
      } else {
        activeSubAcc.type = 'basic';
        activeSubAcc.categoryOption = 'Basic Wallet';
        delete activeSubAcc.limit;
      }
      saveAccountsState();
    }
    subAccountSettingsModal?.classList.remove('active');
    renderSubAccountCarousel();
  });

  // --- SUB-ACCOUNT CREATION ENGINE ---
  const createSubAccountModal = document.getElementById('createSubAccountModal');
  const closeCreateSubModal = document.getElementById('closeCreateSubModal');
  const createSubAccountForm = document.getElementById('createSubAccountForm');
  const newSubLimitToggle = document.getElementById('newSubLimitToggle');
  const newSubLimitGroup = document.getElementById('newSubLimitGroup');
  let selectedNewSubIcon = 'wallet';

  function openCreateSubAccountModal() {
    if (!createSubAccountModal) return;
    const titleEl = document.getElementById('createSubModalTitle');
    if (titleEl) {
      titleEl.textContent = `New Sub-Wallet: ${categoryTitlesMap[currentDropdownCategory] || 'Wallet'}`;
    }
    const titleInput = document.getElementById('newSubTitle');
    if (titleInput) {
      titleInput.value = '';
      setTimeout(() => titleInput.focus(), 80);
    }
    const subInput = document.getElementById('newSubSubtitle');
    if (subInput) subInput.value = '';

    if (newSubLimitToggle) newSubLimitToggle.checked = false;
    if (newSubLimitGroup) newSubLimitGroup.style.display = 'none';

    selectedNewSubIcon = 'wallet';
    setupIconSelector('newSubIconSelector', 'wallet', (icon) => {
      selectedNewSubIcon = icon;
    });

    createSubAccountModal.classList.add('active');
  }

  closeCreateSubModal?.addEventListener('click', () => {
    createSubAccountModal?.classList.remove('active');
  });

  newSubLimitToggle?.addEventListener('change', (e) => {
    if (newSubLimitGroup) newSubLimitGroup.style.display = e.target.checked ? 'block' : 'none';
  });

  createSubAccountForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleInput = document.getElementById('newSubTitle');
    const subInput = document.getElementById('newSubSubtitle');
    const limitInput = document.getElementById('newSubLimitInput');

    const title = titleInput ? titleInput.value.trim() : '';
    if (!title) return;

    const isLimit = newSubLimitToggle ? newSubLimitToggle.checked : false;
    const limitVal = parseFloat(limitInput?.value) || 50000;

    const newSub = {
      id: "sub_" + Date.now(),
      title: title,
      subtitle: subInput?.value.trim() || (isLimit ? "Spent Allocation" : "Primary Liquid Cash"),
      icon: selectedNewSubIcon || "wallet",
      active: true,
      order: (subAccountsData[currentDropdownCategory] || []).length,
      type: isLimit ? "progress" : "basic",
      categoryOption: isLimit ? "Tracking Wallet" : "Basic Wallet",
      ...(isLimit ? { limit: limitVal, spent: 0.00 } : { balance: 0.00 })
    };

    if (!subAccountsData[currentDropdownCategory]) {
      subAccountsData[currentDropdownCategory] = [];
    }
    subAccountsData[currentDropdownCategory].push(newSub);
    activeSubAccountIndex = subAccountsData[currentDropdownCategory].length - 1;

    saveAccountsState();
    createSubAccountModal?.classList.remove('active');
    renderSubAccountCarousel();
  });

  // --- 6. SWITCH ACCOUNTS MODAL ---
  if (switchAccountsBtn && switchAccountsModal) {
    switchAccountsBtn.addEventListener('click', () => {
      renderVisibilityManager();
      switchAccountsModal.classList.add('active');
    });
  }

  closeSwitchModal?.addEventListener('click', () => {
    switchAccountsModal?.classList.remove('active');
  });

  function renderVisibilityManager() {
    if (!switchAccountsModalBody) return;
    switchAccountsModalBody.innerHTML = '';
    
    const catIcons = {
      wallets: "wallet",
      bank_debit: "credit-card",
      living_budget: "pie-chart",
      custom: "sliders",
      topup_wallet: "bus"
    };

    Object.keys(subAccountsData).forEach(catKey => {
      const subList = subAccountsData[catKey];
      const isCurrentCat = catKey === currentDropdownCategory;
      const activeCount = subList.filter(s => s.active).length;

      const accordion = document.createElement('div');
      accordion.className = `category-accordion ${isCurrentCat ? 'open' : ''}`;

      accordion.innerHTML = `
        <div class="accordion-header">
          <div class="accordion-header-left">
            <i data-lucide="${catIcons[catKey] || 'folder'}"></i>
            <h4>${categoryTitlesMap[catKey] || catKey}</h4>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="visibility-count-badge">${activeCount}/${subList.length} Visible</span>
            <i data-lucide="chevron-down" class="accordion-chevron"></i>
          </div>
        </div>
        <div class="accordion-body">
          <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-bottom:4px;">Tap name to Quick Jump • Toggle switch for Visibility:</div>
          ${subList.map((subAcc) => `
            <div class="visibility-item-row">
              <div class="quick-jump-target" data-cat="${catKey}" data-id="${subAcc.id}" title="Quick Jump to ${subAcc.title}">
                <i data-lucide="${subAcc.icon}" style="color:${subAcc.active ? 'var(--accent-blue)' : '#64748b'}; width: 18px; height: 18px;"></i>
                <div>
                  <h5>${subAcc.title}</h5>
                  <p>${subAcc.subtitle || 'Sub-Account'}</p>
                </div>
              </div>
              <label class="toggle-switch" title="Show / Hide in Carousel">
                <input type="checkbox" class="vis-toggle-check" data-cat="${catKey}" data-id="${subAcc.id}" ${subAcc.active ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      `;

      accordion.querySelector('.accordion-header')?.addEventListener('click', () => {
        accordion.classList.toggle('open');
      });

      accordion.querySelectorAll('.quick-jump-target').forEach(target => {
        target.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetCat = target.getAttribute('data-cat');
          const sid = target.getAttribute('data-id');

          currentDropdownCategory = targetCat;
          if (dropdownCategoryTitle) dropdownCategoryTitle.textContent = categoryTitlesMap[targetCat] || "Wallets";

          const targetSub = subAccountsData[targetCat].find(s => s.id === sid);
          if (targetSub) targetSub.active = true;

          const activeSubAccounts = getActiveSubAccounts();
          const idx = activeSubAccounts.findIndex(s => s.id === sid);
          activeSubAccountIndex = idx >= 0 ? idx : 0;

          switchAccountsModal?.classList.remove('active');
          renderSubAccountCarousel();
        });
      });

      accordion.querySelectorAll('.vis-toggle-check').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const sid = checkbox.getAttribute('data-id');
          const targetSub = subList.find(s => s.id === sid);
          if (targetSub) {
            targetSub.active = e.target.checked;
            renderSubAccountCarousel();
          }
        });
      });

      switchAccountsModalBody.appendChild(accordion);
    });

    if (window.lucide) lucide.createIcons();
  }

  // --- 7. ADD WALLET FORM FLOW ---
  let selectedWalletIcon = 'wallet';

  addAccountBtn?.addEventListener('click', () => {
    addAccountModal?.classList.add('active');
    const nameInput = document.getElementById('newAccName');
    if (nameInput) {
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 80);
    }
    selectedWalletIcon = 'wallet';
    setupIconSelector('walletIconSelector', 'wallet', (icon) => {
      selectedWalletIcon = icon;
    });
  });

  closeAddModal?.addEventListener('click', () => {
    addAccountModal?.classList.remove('active');
  });

  newAccountForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('newAccName');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;

    const catKey = 'wallet_' + Date.now();

    categoryTitlesMap[catKey] = name;
    catIconMap[catKey] = selectedWalletIcon;

    // A newly created main wallet starts with an empty sub-wallet card area with the green '+' button!
    subAccountsData[catKey] = [];
    if (!categoryOrder.includes(catKey)) {
      categoryOrder.push(catKey);
    }
    currentDropdownCategory = catKey;
    activeSubAccountIndex = 0;

    saveAccountsState();

    newAccountForm.reset();
    selectedWalletIcon = 'wallet';

    addAccountModal?.classList.remove('active');
    renderCategoryDropdownMenu();
    renderSubAccountCarousel();
    renderAccountSelectorChips();
  });

  // --- ORDER & UNDO TOAST MANAGEMENT ---
  function getOrderedCategoryKeys() {
    const dataKeys = Object.keys(subAccountsData);
    let ordered = (categoryOrder || []).filter(k => dataKeys.includes(k));
    dataKeys.forEach(k => {
      if (!ordered.includes(k)) ordered.push(k);
    });
    return ordered;
  }

  let undoTimeout = null;
  let deletedWalletBackup = null;

  function showUndoToast(message, onUndo) {
    const toast = document.getElementById('undoToast');
    const textEl = document.getElementById('undoToastText');
    const btnEl = document.getElementById('undoToastBtn');
    if (!toast || !textEl || !btnEl) {
      console.warn('Toast elements not found', { toast, textEl, btnEl });
      return;
    }

    if (undoTimeout) clearTimeout(undoTimeout);

    textEl.textContent = message;
    toast.classList.add('show');
    toast.style.setProperty('display', 'flex', 'important');
    toast.style.setProperty('opacity', '1', 'important');
    toast.style.setProperty('visibility', 'visible', 'important');
    toast.style.setProperty('transform', 'translateX(-50%) translateY(0) rotate(0deg)', 'important');
    toast.style.setProperty('transition', 'opacity 0.25s ease, transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)', 'important');
    toast.style.setProperty('pointer-events', 'auto', 'important');
    toast.style.setProperty('z-index', '999999', 'important');
    if (window.lucide) lucide.createIcons();

    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);

    const handleUndoAction = (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearTimeout(undoTimeout);
      hideUndoToast();
      if (onUndo) onUndo();
    };

    btnEl.ontouchend = handleUndoAction;
    btnEl.onclick = handleUndoAction;

    undoTimeout = setTimeout(() => {
      hideUndoToast();
      deletedWalletBackup = null;
    }, 6000);
  }

  function hideUndoToast() {
    const toast = document.getElementById('undoToast');
    if (!toast) return;
    toast.classList.remove('show');
    toast.style.setProperty('opacity', '0', 'important');
    toast.style.setProperty('visibility', 'hidden', 'important');
    toast.style.setProperty('transform', 'translateX(-50%) translateY(30px)', 'important');
  }

  // --- UNDO TOAST SWIPE-TO-DISMISS IN ANY DIRECTION ---
  function setupUndoToastSwipe() {
    const toast = document.getElementById('undoToast');
    const btnEl = document.getElementById('undoToastBtn');
    if (!toast) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentDeltaX = 0;
    let currentDeltaY = 0;

    function onStart(clientX, clientY, target) {
      if (btnEl && (target === btnEl || btnEl.contains(target))) return;
      isDragging = true;
      startX = clientX;
      startY = clientY;
      currentDeltaX = 0;
      currentDeltaY = 0;
      toast.style.transition = 'none';
    }

    function onMove(clientX, clientY) {
      if (!isDragging) return;
      currentDeltaX = clientX - startX;
      currentDeltaY = clientY - startY;

      const dist = Math.hypot(currentDeltaX, currentDeltaY);
      const rotation = currentDeltaX * 0.08;
      const opacity = Math.max(0.15, 1 - (dist / 160));

      toast.style.transform = `translateX(calc(-50% + ${currentDeltaX}px)) translateY(${currentDeltaY}px) rotate(${rotation}deg)`;
      toast.style.opacity = opacity;
    }

    function onEnd() {
      if (!isDragging) return;
      isDragging = false;

      const dist = Math.hypot(currentDeltaX, currentDeltaY);
      toast.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.25s ease';

      // If swiped/flicked in any direction (threshold: 38px)
      if (dist > 38) {
        if (undoTimeout) clearTimeout(undoTimeout);
        if (navigator.vibrate) navigator.vibrate(25);

        // Throw direction animation
        if (Math.abs(currentDeltaX) > Math.abs(currentDeltaY)) {
          // Horizontal fling left or right
          const throwX = currentDeltaX > 0 ? '160%' : '-200%';
          const rot = currentDeltaX > 0 ? 22 : -22;
          toast.style.transform = `translateX(${throwX}) translateY(${currentDeltaY}px) rotate(${rot}deg)`;
        } else {
          // Vertical fling up or down
          const throwY = currentDeltaY > 0 ? 140 : -110;
          toast.style.transform = `translateX(calc(-50% + ${currentDeltaX}px)) translateY(${throwY}px) scale(0.85)`;
        }
        toast.style.opacity = '0';

        setTimeout(() => {
          hideUndoToast();
          deletedWalletBackup = null;
        }, 260);
      } else {
        // Snap back cleanly to center
        toast.style.transform = 'translateX(-50%) translateY(0) rotate(0deg)';
        toast.style.opacity = '1';
      }
    }

    // Touch events for mobile
    toast.addEventListener('touchstart', (e) => {
      onStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });

    toast.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    toast.addEventListener('touchend', onEnd);
    toast.addEventListener('touchcancel', onEnd);

    // Mouse events for desktop
    toast.addEventListener('mousedown', (e) => {
      onStart(e.clientX, e.clientY, e.target);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) onMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) onEnd();
    });
  }
  setupUndoToastSwipe();

  function deleteMainWallet(catKey) {
    if (PROTECTED_CATEGORIES.includes(catKey)) return;

    const title = categoryTitlesMap[catKey] || 'Wallet';
    const subList = subAccountsData[catKey] || [];
    const icon = catIconMap[catKey] || 'wallet';
    const orderIndex = categoryOrder.indexOf(catKey);

    // Save full backup for undo
    deletedWalletBackup = {
      catKey,
      title,
      icon,
      subList: JSON.parse(JSON.stringify(subList)),
      orderIndex: orderIndex >= 0 ? orderIndex : categoryOrder.length
    };

    // Remove from live collections
    delete subAccountsData[catKey];
    delete categoryTitlesMap[catKey];
    delete catIconMap[catKey];
    categoryOrder = categoryOrder.filter(k => k !== catKey);

    // Close dropdown menu so the user sees the main view and the undo toast immediately!
    accountCategoryDropdownBtn?.classList.remove('open');
    accountCategoryDropdownMenu?.classList.remove('open');

    // If currently viewing deleted wallet, switch to 'wallets'
    if (currentDropdownCategory === catKey) {
      currentDropdownCategory = 'wallets';
      activeSubAccountIndex = 0;
    }

    saveAccountsState();
    renderCategoryDropdownMenu();
    renderSubAccountCarousel();
    renderAccountSelectorChips();

    // Show undo toast
    showUndoToast(`"${title}" deleted`, () => {
      if (deletedWalletBackup && deletedWalletBackup.catKey === catKey) {
        subAccountsData[catKey] = deletedWalletBackup.subList;
        categoryTitlesMap[catKey] = deletedWalletBackup.title;
        catIconMap[catKey] = deletedWalletBackup.icon;
        categoryOrder.splice(deletedWalletBackup.orderIndex, 0, catKey);
        currentDropdownCategory = catKey;
        activeSubAccountIndex = 0;
        saveAccountsState();
        renderCategoryDropdownMenu();
        renderSubAccountCarousel();
        renderAccountSelectorChips();
        deletedWalletBackup = null;
      }
    });
  }

  // --- Dynamic Main Category Dropdown Generator (Renders in SS2 dropdown menu with Tap & Hold Drag & Clean Swipe) ---
  let draggedCatKey = null;

  function renderCategoryDropdownMenu() {
    if (!accountCategoryDropdownMenu) return;
    accountCategoryDropdownMenu.innerHTML = '';

    const orderedKeys = getOrderedCategoryKeys();

    orderedKeys.forEach((catKey) => {
      const isProtected = PROTECTED_CATEGORIES.includes(catKey);
      const isCurrent = catKey === currentDropdownCategory;
      const title = categoryTitlesMap[catKey] || catKey;
      const iconName = catIconMap[catKey] || (subAccountsData[catKey]?.[0]?.type === 'progress' ? 'pie-chart' : 'wallet');

      const wrapper = document.createElement('div');
      wrapper.className = `dropdown-item-wrapper ${isCurrent ? 'active-item' : ''}`;
      wrapper.setAttribute('data-cat', catKey);

      // Red Delete Button docked behind (only for non-protected categories)
      let deleteBtnHtml = '';
      if (!isProtected) {
        deleteBtnHtml = `
          <button type="button" class="dropdown-delete-action" title="Delete Wallet">
            <i data-lucide="trash-2"></i>
          </button>
        `;
      }

      wrapper.innerHTML = `
        ${deleteBtnHtml}
        <div class="dropdown-menu-item ${isCurrent ? 'active' : ''}">
          <i data-lucide="${iconName}"></i>
          <span class="dropdown-item-title">${title}</span>
        </div>
      `;

      const itemEl = wrapper.querySelector('.dropdown-menu-item');
      const deleteBtn = wrapper.querySelector('.dropdown-delete-action');

      // 1. Click to Select Wallet
      itemEl.addEventListener('click', (e) => {
        if (wrapper.classList.contains('swiped')) {
          wrapper.classList.remove('swiped');
          itemEl.style.transform = '';
          return;
        }
        e.stopPropagation();
        currentDropdownCategory = catKey;
        if (dropdownCategoryTitle) {
          dropdownCategoryTitle.textContent = categoryTitlesMap[currentDropdownCategory] || "Wallets";
        }
        accountCategoryDropdownBtn?.classList.remove('open');
        accountCategoryDropdownMenu.classList.remove('open');
        activeSubAccountIndex = 0;
        renderCategoryDropdownMenu();
        renderSubAccountCarousel();
      });

      // 2. Delete Button Trigger (Direct pointer/touch/click bindings)
      if (!isProtected && deleteBtn) {
        let isDeleteTriggered = false;
        const handleDeleteAction = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isDeleteTriggered) return;
          isDeleteTriggered = true;
          setTimeout(() => { isDeleteTriggered = false; }, 800);
          deleteMainWallet(catKey);
        };
        deleteBtn.onpointerdown = (e) => e.stopPropagation();
        deleteBtn.ontouchstart = (e) => e.stopPropagation();
        deleteBtn.ontouchend = handleDeleteAction;
        deleteBtn.onclick = handleDeleteAction;
      }

      // 3. Mobile Touch: Tap & Hold (Drag) + Swipe to Delete
      let touchStartX = 0;
      let touchStartY = 0;
      let longPressTimer = null;
      let isLongPressed = false;
      let isHorizontalSwipe = false;

      wrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isLongPressed = false;
        isHorizontalSwipe = false;

        longPressTimer = setTimeout(() => {
          isLongPressed = true;
          draggedCatKey = catKey;
          wrapper.classList.add('dragging-active');
          itemEl.style.transform = 'scale(1.05) translateY(-3px)';
          if (navigator.vibrate) navigator.vibrate([40, 25]);
        }, 280);
      }, { passive: true });

      wrapper.addEventListener('touchmove', (e) => {
        const curX = e.touches[0].clientX;
        const curY = e.touches[0].clientY;
        const diffX = curX - touchStartX;
        const diffY = curY - touchStartY;

        // If finger moves before long press fires, cancel it
        if (!isLongPressed && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
          clearTimeout(longPressTimer);
        }

        // If Tap & Hold Drag Mode is active, physically move with finger!
        if (isLongPressed) {
          e.preventDefault();
          const deltaY = curY - touchStartY;
          itemEl.style.transform = `scale(1.05) translateY(${deltaY}px)`;

          const targetEl = document.elementFromPoint(curX, curY);
          const targetWrap = targetEl?.closest('.dropdown-item-wrapper');
          document.querySelectorAll('.dropdown-item-wrapper').forEach(w => w.classList.remove('drop-target-indicator'));
          if (targetWrap && targetWrap !== wrapper) {
            targetWrap.classList.add('drop-target-indicator');
          }
          return;
        }

        // Swipe to Delete (only for non-protected, must be intentional left movement)
        if (!isProtected && diffX < -12 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
          isHorizontalSwipe = true;
          const move = Math.max(-60, diffX);
          itemEl.style.transform = `translateX(${move}px)`;
        }
      }, { passive: false });

      wrapper.addEventListener('touchend', (e) => {
        clearTimeout(longPressTimer);

        // Do not intercept if delete button itself was tapped
        if (e.target.closest('.dropdown-delete-action')) return;

        // If Dragging Mode was active:
        if (isLongPressed) {
          isLongPressed = false;
          wrapper.classList.remove('dragging-active');
          itemEl.style.transform = '';
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const targetEl = document.elementFromPoint(endX, endY);
          const targetWrap = targetEl?.closest('.dropdown-item-wrapper');
          document.querySelectorAll('.dropdown-item-wrapper').forEach(w => w.classList.remove('drop-target-indicator'));

          if (targetWrap && targetWrap !== wrapper) {
            const targetKey = targetWrap.getAttribute('data-cat');
            const fromIdx = categoryOrder.indexOf(catKey);
            const toIdx = categoryOrder.indexOf(targetKey);
            if (fromIdx >= 0 && toIdx >= 0) {
              categoryOrder.splice(fromIdx, 1);
              categoryOrder.splice(toIdx, 0, catKey);
              saveAccountsState();
              renderCategoryDropdownMenu();
              return;
            }
          }
          return;
        }

        // If Swipe was performed:
        if (isHorizontalSwipe) {
          const endX = e.changedTouches[0].clientX;
          const diffX = endX - touchStartX;
          if (diffX < -30) {
            wrapper.classList.add('swiped');
            itemEl.style.transform = 'translateX(-60px)';
          } else {
            wrapper.classList.remove('swiped');
            itemEl.style.transform = '';
          }
          return;
        }

        // If tap occurred while already swiped, close it:
        if (wrapper.classList.contains('swiped')) {
          wrapper.classList.remove('swiped');
          itemEl.style.transform = '';
        }
      });

      // 4. Desktop Mouse Support for Drag & Drop
      let mouseTimer = null;
      wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        mouseTimer = setTimeout(() => {
          wrapper.setAttribute('draggable', 'true');
          wrapper.classList.add('dragging-active');
          draggedCatKey = catKey;
        }, 300);
      });

      wrapper.addEventListener('mouseup', () => {
        clearTimeout(mouseTimer);
        wrapper.classList.remove('dragging-active');
      });

      wrapper.addEventListener('dragstart', (e) => {
        draggedCatKey = catKey;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', catKey);
      });

      wrapper.addEventListener('dragover', (e) => {
        e.preventDefault();
        wrapper.classList.add('drop-target-indicator');
      });

      wrapper.addEventListener('dragleave', () => {
        wrapper.classList.remove('drop-target-indicator');
      });

      wrapper.addEventListener('dragend', () => {
        wrapper.classList.remove('dragging-active', 'drop-target-indicator');
        wrapper.removeAttribute('draggable');
        draggedCatKey = null;
      });

      wrapper.addEventListener('drop', (e) => {
        e.preventDefault();
        wrapper.classList.remove('drop-target-indicator');
        wrapper.removeAttribute('draggable');
        if (!draggedCatKey || draggedCatKey === catKey) return;

        const fromIdx = categoryOrder.indexOf(draggedCatKey);
        const toIdx = categoryOrder.indexOf(catKey);
        if (fromIdx >= 0 && toIdx >= 0) {
          categoryOrder.splice(fromIdx, 1);
          categoryOrder.splice(toIdx, 0, draggedCatKey);
          saveAccountsState();
          renderCategoryDropdownMenu();
        }
      });

      accountCategoryDropdownMenu.appendChild(wrapper);
    });

    if (dropdownCategoryTitle) {
      dropdownCategoryTitle.textContent = categoryTitlesMap[currentDropdownCategory] || 'Wallets';
    }

    if (window.lucide) lucide.createIcons();
  }

  // --- 8. MAIN SCREEN BODY SWIPER & NAVIGATION DOCK LOGIC ---
  let currentActiveTabIndex = 0;
  const navItems = document.querySelectorAll('.nav-item');
  const swipeIndicator = document.getElementById('swipeIndicator');

  function updateTabNavigation(targetIndex) {
    currentActiveTabIndex = Math.max(0, Math.min(3, targetIndex));

    const viewsSliderTrack = document.getElementById('viewsSliderTrack');
    if (viewsSliderTrack) {
      viewsSliderTrack.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      viewsSliderTrack.style.transform = `translateX(-${currentActiveTabIndex * 25}%)`;
    }

    navItems.forEach((item) => {
      const itemIndex = parseInt(item.getAttribute('data-tab'), 10);
      const glow = item.querySelector('.active-glow');
      if (itemIndex === currentActiveTabIndex) {
        item.classList.add('active');
        if (glow) glow.style.opacity = '1';
      } else {
        item.classList.remove('active');
        if (glow) glow.style.opacity = '0';
      }
    });

    if (swipeIndicator) {
      swipeIndicator.innerHTML = ''; // Clear before re-rendering indicators
      for (let i = 0; i < 4; i++) {
        const span = document.createElement('span');
        span.className = `indicator-item ${i === currentActiveTabIndex ? 'active-pill' : 'dot'}`;
        span.setAttribute('data-index', i);
        span.addEventListener('click', () => updateTabNavigation(i));
        swipeIndicator.appendChild(span);
      }
    }
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const tabIndex = parseInt(item.getAttribute('data-tab'), 10);
      updateTabNavigation(tabIndex);
    });
  });

  // --- 9. SYSTEM DEFAULT & 3-WAY THEME ENGINE ---
  let currentThemeMode = localStorage.getItem('appThemeMode') || 'system';

  function applyThemeMode(mode) {
    currentThemeMode = mode;
    localStorage.setItem('appThemeMode', mode);

    const themeSegBtns = document.querySelectorAll('.theme-seg-btn');
    themeSegBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme-mode') === mode);
    });

    const themeModeSubtext = document.getElementById('themeModeSubtext');
    if (themeModeSubtext) {
      if (mode === 'system') themeModeSubtext.textContent = 'System Auto (Default)';
      else if (mode === 'dark') themeModeSubtext.textContent = 'Dark Mode Active';
      else themeModeSubtext.textContent = 'Light Mode Active';
    }

    if (mode === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    } else if (mode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (window.lucide) lucide.createIcons();
  }

  // Listen to OS Dark Mode Changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (currentThemeMode === 'system') {
        if (e.matches) document.documentElement.setAttribute('data-theme', 'dark');
        else document.documentElement.removeAttribute('data-theme');
      }
    });
  }

  // Attach click listener on theme segmented pills
  document.querySelectorAll('.theme-seg-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = btn.getAttribute('data-theme-mode');
      applyThemeMode(mode);
    });
  });

  // Apply default on startup
  applyThemeMode(currentThemeMode);

  // ==========================================================================
  // TRANSACTION AMOUNT CURRENCY FORMATTER (Decimal Lock & Cents Toggle)
  // ==========================================================================
  const transactionAmount = document.getElementById('transactionAmount');
  const decimalLockBtn = document.getElementById('decimalLockBtn');
  const decimalLockText = document.getElementById('decimalLockText');
  let isDecimalLocked = true; // Default: .00 is locked/fixed inside the input

  function positionCursorBeforeCents(input) {
    if (!input) return;
    if (isDecimalLocked) {
      const pos = Math.max(0, input.value.length - 3);
      input.setSelectionRange(pos, pos);
    }
  }

  function updateDecimalLockUI() {
    if (!transactionAmount) return;
    if (isDecimalLocked) {
      decimalLockBtn?.classList.add('locked');
      if (decimalLockText) decimalLockText.textContent = '.00 Locked';
      const lockIcon = decimalLockBtn?.querySelector('.lock-icon');
      if (lockIcon) lockIcon.setAttribute('data-lucide', 'lock');
      
      let raw = transactionAmount.value;
      let intDigits = raw.replace(/\.00$/, '').replace(/\D/g, '');
      if (!intDigits || intDigits === '' || parseInt(intDigits, 10) === 0) {
        transactionAmount.value = '0.00';
      } else {
        transactionAmount.value = parseInt(intDigits, 10).toLocaleString('en-US') + '.00';
      }
      transactionAmount.inputMode = 'numeric';
      positionCursorBeforeCents(transactionAmount);
    } else {
      decimalLockBtn?.classList.remove('locked');
      if (decimalLockText) decimalLockText.textContent = '.00 Unlocked';
      const lockIcon = decimalLockBtn?.querySelector('.lock-icon');
      if (lockIcon) lockIcon.setAttribute('data-lucide', 'unlock');
      
      let digits = transactionAmount.value.replace(/\D/g, '');
      if (!digits || digits === '' || parseInt(digits, 10) === 0) {
        transactionAmount.value = '0.00';
      } else {
        const amount = parseFloat(digits) / 100;
        transactionAmount.value = amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
      transactionAmount.inputMode = 'decimal';
    }
    if (window.lucide) lucide.createIcons();
  }

  decimalLockBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDecimalLocked = !isDecimalLocked;
    updateDecimalLockUI();
    transactionAmount?.focus();
    positionCursorBeforeCents(transactionAmount);
  });

  if (transactionAmount) {
    transactionAmount.addEventListener('focus', function() {
      if (isDecimalLocked) {
        setTimeout(() => positionCursorBeforeCents(this), 10);
      } else {
        this.select();
      }
    });

    transactionAmount.addEventListener('click', function() {
      if (isDecimalLocked) {
        positionCursorBeforeCents(this);
      }
    });

    transactionAmount.addEventListener('input', function(e) {
      if (isDecimalLocked) {
        let raw = this.value;
        let intDigits = raw.replace(/\.00$/, '').replace(/\D/g, '');
        if (!intDigits || intDigits === '' || parseInt(intDigits, 10) === 0) {
          this.value = '0.00';
        } else {
          this.value = parseInt(intDigits, 10).toLocaleString('en-US') + '.00';
        }
        positionCursorBeforeCents(this);
      } else {
        let digits = this.value.replace(/\D/g, '');
        if (!digits || digits === '' || parseInt(digits, 10) === 0) {
          this.value = '0.00';
          return;
        }
        const amount = parseFloat(digits) / 100;
        this.value = amount.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      }
    });

    transactionAmount.addEventListener('keydown', function(e) {
      if (e.key === 'Backspace') {
        if (isDecimalLocked) {
          e.preventDefault();
          let raw = this.value;
          let intDigits = raw.replace(/\.00$/, '').replace(/\D/g, '');
          if (intDigits.length <= 1) {
            this.value = '0.00';
          } else {
            intDigits = intDigits.slice(0, -1);
            this.value = parseInt(intDigits, 10).toLocaleString('en-US') + '.00';
          }
          positionCursorBeforeCents(this);
        } else {
          let digits = this.value.replace(/\D/g, '');
          if (digits.length <= 1) {
            e.preventDefault();
            this.value = '0.00';
            this.select();
          }
        }
      }
    });
  }

  // ==========================================================================
  // QUICK ADD MODAL & TYPE HERE FOCUS ENGINE
  // ==========================================================================
  const quickAddEmptyModal = document.getElementById('quickAddEmptyModal');
  const closeQuickAddEmptyBtn = document.getElementById('closeQuickAddEmptyBtn');
  const typeCapsule = document.querySelector('.type-input-capsule');
  const plusBtn = document.querySelector('.plus-btn');

  // catIconMap is defined at the top of script.js

  function renderAccountSelectorChips() {
    const chipsContainer = document.getElementById('accountSelectorChips');
    if (!chipsContainer) return;
    chipsContainer.innerHTML = '';
    let isFirst = true;
    Object.keys(subAccountsData).forEach(catKey => {
      const icon = catIconMap[catKey] || 'wallet';
      const label = categoryTitlesMap[catKey] || catKey;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'acc-chip' + (isFirst ? ' active' : '');
      chip.setAttribute('data-acc', catKey);
      chip.innerHTML = `<i data-lucide="${icon}"></i> ${label}`;
      chip.addEventListener('click', () => {
        chipsContainer.querySelectorAll('.acc-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
      chipsContainer.appendChild(chip);
      isFirst = false;
    });
    if (window.lucide) lucide.createIcons();
  }

  function initDateTimeDefaults() {
    const dateInput = document.getElementById('transactionDate');
    const timeInput = document.getElementById('transactionTime');
    if (!dateInput || !timeInput) return;
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    timeInput.value = `${hh}:${min}`;
  }

  function openQuickAddModal(autoFocus = false) {
    if (!quickAddEmptyModal) return;
    // Reset form fields
    if (transactionAmount) transactionAmount.value = '0.00';
    const selCatText = document.getElementById('selectedCategoryText');
    if (selCatText) selCatText.textContent = 'Select category';
    document.getElementById('transactionNote') && (document.getElementById('transactionNote').value = '');
    // Clear errors
    quickAddEmptyModal.querySelectorAll('.field-error').forEach(el => el.remove());
    quickAddEmptyModal.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    // Dynamic account chips
    renderAccountSelectorChips();
    // Set current date & time
    initDateTimeDefaults();
    quickAddEmptyModal.classList.add('active');
    if (autoFocus && transactionAmount) {
      setTimeout(() => {
        transactionAmount.focus();
        if (isDecimalLocked) positionCursorBeforeCents(transactionAmount);
      }, 60);
    }
  }

  function handleTypeHereEvent(e) {
    e.preventDefault();
    e.stopPropagation();
    openQuickAddModal(true);
  }

  typeCapsule?.addEventListener('touchend', handleTypeHereEvent);
  typeCapsule?.addEventListener('click', handleTypeHereEvent);

  plusBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    openQuickAddModal(false);
  });

  closeQuickAddEmptyBtn?.addEventListener('click', () => {
    quickAddEmptyModal?.classList.remove('active');
  });

  // ==========================================================================
  // SAVE TRANSACTION FORM VALIDATION
  // ==========================================================================
  const quickAddForm = document.getElementById('quickAddForm');
  quickAddForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Clear previous errors
    quickAddForm.querySelectorAll('.field-error').forEach(el => el.remove());
    quickAddForm.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    let isValid = true;

    function showFieldError(anchorEl, msg) {
      if (!anchorEl) return;
      anchorEl.classList.add('input-error');
      const errEl = document.createElement('span');
      errEl.className = 'field-error';
      errEl.textContent = msg;
      anchorEl.parentNode.insertBefore(errEl, anchorEl.nextSibling);
      isValid = false;
    }

    // 1. Amount must be > 0
    const rawAmt = transactionAmount ? transactionAmount.value.replace(/,/g, '') : '0';
    const numAmt = parseFloat(rawAmt);
    if (!numAmt || numAmt <= 0) {
      showFieldError(transactionAmount, 'Amount must be greater than 0');
    }

    // 2. Category must be selected
    const catText = document.getElementById('selectedCategoryText');
    const catBtn = document.getElementById('openCategoryModalBtn');
    if (!catText || catText.textContent.trim() === 'Select category') {
      showFieldError(catBtn, 'Please select a category');
    }

    // 3. Account chip must be selected
    const activeChip = document.querySelector('#accountSelectorChips .acc-chip.active');
    if (!activeChip) {
      const chipsContainer = document.getElementById('accountSelectorChips');
      const errEl = document.createElement('span');
      errEl.className = 'field-error';
      errEl.textContent = 'Please select an account';
      if (chipsContainer) chipsContainer.after(errEl);
      isValid = false;
    }

    if (!isValid) return;

    // All valid — save (console log for now, replace with real save later)
    const selectedType = document.querySelector('.type-toggle-btn.active')?.getAttribute('data-type') || 'expense';
    const selectedAcc = activeChip?.getAttribute('data-acc') || '';
    const selectedCat = catText?.textContent || '';
    const note = document.getElementById('transactionNote')?.value || '';
    const dateVal = document.getElementById('transactionDate')?.value || '';
    const timeVal = document.getElementById('transactionTime')?.value || '';
    console.log('SAVE TRANSACTION:', { type: selectedType, account: selectedAcc, amount: numAmt, category: selectedCat, note, date: dateVal, time: timeVal });
    quickAddEmptyModal?.classList.remove('active');
  });

  // ==========================================================================
  // DYNAMIC FULL-SCREEN CATEGORY SELECTION ENGINE
  // ==========================================================================
  const categorySelectionModal = document.getElementById('categorySelectionModal');
  const openCategoryModalBtn = document.getElementById('openCategoryModalBtn');
  const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
  const selectedCategoryText = document.getElementById('selectedCategoryText');
  const categoryListContainer = document.getElementById('categoryListContainer');
  
  const catTab1 = document.getElementById('catTab1');
  const catTab2 = document.getElementById('catTab2');
  const catTab3 = document.getElementById('catTab3');

  const categoryData = {
    outcome: [
      { name: 'Lost', icon: 'help-circle', color: '#ef4444' },
      { name: 'Other Expense', icon: 'box', color: '#f97316' },
      { name: 'Outgoing transfer', icon: 'arrow-up-right', color: '#f59e0b' },
      { 
        name: 'Shopping', 
        icon: 'shopping-bag', 
        color: '#06b6d4',
        sub: ['Houseware', 'Makeup', 'Personal Items', 'Clothes & Shoes', 'Electronics']
      },
      { 
        name: 'Transportation', 
        icon: 'car', 
        color: '#3b82f6',
        sub: ['Bus', 'Pick me', 'Train', 'Fuel', 'Taxi', 'Parking']
      },
      { 
        name: 'Food & Dining', 
        icon: 'utensils', 
        color: '#10b981',
        sub: ['Groceries', 'Restaurant', 'Coffee & Tea', 'Snacks', 'Delivery']
      },
      { 
        name: 'Bills & Utilities', 
        icon: 'zap', 
        color: '#8b5cf6',
        sub: ['Electricity', 'Water', 'Internet', 'Mobile Reload', 'Gas']
      },
      { 
        name: 'Health & Personal', 
        icon: 'heart-pulse', 
        color: '#ec4899',
        sub: ['Doctor / Medical', 'Pharmacy', 'Fitness & Gym']
      }
    ],
    income: [
      { name: 'Salary', icon: 'badge-dollar-sign', color: '#10b981' },
      { name: 'Incoming transfer', icon: 'arrow-down-left', color: '#3b82f6' },
      { name: 'Business / Freelance', icon: 'briefcase', color: '#8b5cf6' },
      { name: 'Gifts / Allowance', icon: 'gift', color: '#f59e0b' },
      { name: 'Investments', icon: 'trending-up', color: '#06b6d4' },
      { name: 'Other Income', icon: 'plus-circle', color: '#14b8a6' }
    ],
    transfer_out: [
      { name: 'Transfer to Bank', icon: 'landmark', color: '#3b82f6' },
      { name: 'Transfer to Wallet', icon: 'wallet', color: '#10b981' },
      { name: 'Top-up Bus Card', icon: 'bus', color: '#f59e0b' }
    ],
    transfer_in: [
      { name: 'Transfer from Bank', icon: 'landmark', color: '#3b82f6' },
      { name: 'Transfer from Wallet', icon: 'wallet', color: '#10b981' },
      { name: 'Top-up Refund', icon: 'refresh-cw', color: '#f59e0b' }
    ],
    lent: [
      { name: 'Lent to Friend', icon: 'user-minus', color: '#ef4444' },
      { name: 'Lent to Family', icon: 'users', color: '#f97316' },
      { name: 'Advance Payment', icon: 'clock', color: '#8b5cf6' }
    ],
    borrowed: [
      { name: 'Borrowed from Friend', icon: 'user-plus', color: '#10b981' },
      { name: 'Borrowed from Bank (Loan)', icon: 'landmark', color: '#3b82f6' },
      { name: 'Credit Card Credit', icon: 'credit-card', color: '#f59e0b' }
    ]
  };

  let currentCatTab = 'tab1';

  function renderCategoryList(catArray) {
    if (!categoryListContainer) return;
    categoryListContainer.innerHTML = '';

    catArray.forEach(cat => {
      const itemEl = document.createElement('div');
      itemEl.className = 'category-list-item';
      itemEl.innerHTML = `
        <div class="cat-icon-circle" style="background: ${cat.color};">
          <i data-lucide="${cat.icon}"></i>
        </div>
        <span class="cat-item-title">${cat.name}</span>
      `;
      itemEl.addEventListener('click', () => {
        if (selectedCategoryText) selectedCategoryText.textContent = cat.name;
        categorySelectionModal?.classList.remove('active');
      });
      categoryListContainer.appendChild(itemEl);

      if (cat.sub && cat.sub.length > 0) {
        cat.sub.forEach(subName => {
          const subEl = document.createElement('div');
          subEl.className = 'category-sub-item';
          subEl.innerHTML = `
            <div class="cat-sub-icon-circle" style="background: ${cat.color}; opacity: 0.85;">
              <i data-lucide="${cat.icon}"></i>
            </div>
            <span class="cat-item-title">${subName}</span>
          `;
          subEl.addEventListener('click', () => {
            if (selectedCategoryText) selectedCategoryText.textContent = `${cat.name} - ${subName}`;
            categorySelectionModal?.classList.remove('active');
          });
          categoryListContainer.appendChild(subEl);
        });
      }
    });

    if (window.lucide) lucide.createIcons();
  }

  function updateCategoryTabsAndList() {
    const isIncome = document.querySelector('.type-toggle-btn[data-type="income"]')?.classList.contains('active');
    
    if (isIncome) {
      if (catTab1) catTab1.textContent = 'INCOME';
      if (catTab2) catTab2.textContent = 'TRANSFER FROM';
      if (catTab3) catTab3.textContent = 'BORROWED (TO PAY)';
      
      if (currentCatTab === 'tab1') renderCategoryList(categoryData.income);
      else if (currentCatTab === 'tab2') renderCategoryList(categoryData.transfer_in);
      else renderCategoryList(categoryData.borrowed);
    } else {
      if (catTab1) catTab1.textContent = 'OUTCOME';
      if (catTab2) catTab2.textContent = 'TRANSFER TO';
      if (catTab3) catTab3.textContent = 'LENT (TO RECEIVE)';
      
      if (currentCatTab === 'tab1') renderCategoryList(categoryData.outcome);
      else if (currentCatTab === 'tab2') renderCategoryList(categoryData.transfer_out);
      else renderCategoryList(categoryData.lent);
    }
  }

  openCategoryModalBtn?.addEventListener('click', () => {
    currentCatTab = 'tab1';
    [catTab1, catTab2, catTab3].forEach(t => t?.classList.remove('active'));
    catTab1?.classList.add('active');
    updateCategoryTabsAndList();
    categorySelectionModal?.classList.add('active');
  });

  closeCategoryModalBtn?.addEventListener('click', () => {
    categorySelectionModal?.classList.remove('active');
  });

  catTab1?.addEventListener('click', () => {
    currentCatTab = 'tab1';
    [catTab1, catTab2, catTab3].forEach(t => t?.classList.remove('active'));
    catTab1.classList.add('active');
    updateCategoryTabsAndList();
  });

  catTab2?.addEventListener('click', () => {
    currentCatTab = 'tab2';
    [catTab1, catTab2, catTab3].forEach(t => t?.classList.remove('active'));
    catTab2.classList.add('active');
    updateCategoryTabsAndList();
  });

  catTab3?.addEventListener('click', () => {
    currentCatTab = 'tab3';
    [catTab1, catTab2, catTab3].forEach(t => t?.classList.remove('active'));
    catTab3.classList.add('active');
    updateCategoryTabsAndList();
  });

  // Glowing Sliding Segmented Control (Outcome / Income Toggle)
  const typeToggleBtns = document.querySelectorAll('.type-toggle-btn');
  const typeIndicator = document.getElementById('typeIndicator');

  typeToggleBtns.forEach(btn => {
    btn?.addEventListener('click', (e) => {
      typeToggleBtns.forEach(b => b.classList.remove('active'));
      const target = e.target.closest('.type-toggle-btn') || e.target;
      target.classList.add('active');

      const type = target.getAttribute('data-type');
      if (type === 'income') {
        typeIndicator?.classList.add('income-mode');
      } else {
        typeIndicator?.classList.remove('income-mode');
      }
    });
  });

  // Account chips are dynamically rendered by renderAccountSelectorChips() on modal open

  // ==========================================================================
  // UNIFIED TOUCH GESTURES: VERTICAL (Search / Report) & HORIZONTAL (Tabs)
  // ==========================================================================
  const searchSwipeModal = document.getElementById('searchSwipeModal');
  const reportSwipeModal = document.getElementById('reportSwipeModal');
  const closeSearchSwipeBtn = document.getElementById('closeSearchSwipeBtn');
  const closeReportSwipeBtn = document.getElementById('closeReportSwipeBtn');
  const swipeSearchInput = document.getElementById('swipeSearchInput');

  closeSearchSwipeBtn?.addEventListener('click', () => searchSwipeModal?.classList.remove('active'));
  closeReportSwipeBtn?.addEventListener('click', () => reportSwipeModal?.classList.remove('active'));

  function setupMainScreenGestures() {
    const viewsOverlay = document.getElementById('viewsOverlay');
    const viewsSliderTrack = document.getElementById('viewsSliderTrack');
    if (!viewsOverlay || !viewsSliderTrack) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let touchCurrentY = 0;
    let isTouching = false;
    let gestureDirection = null; // 'horizontal' | 'vertical' | null

    function onTouchStart(clientX, clientY, targetEl) {
      // Ignore gesture if inside any active modal, menu, or interactive element
      if (targetEl.closest('.full-modal-overlay.active') || targetEl.closest('.dropdown-menu-card') || targetEl.closest('.dock-wrapper') || targetEl.closest('.card-carousel-surface')) {
        return;
      }
      touchStartX = clientX;
      touchStartY = clientY;
      touchCurrentX = clientX;
      touchCurrentY = clientY;
      isTouching = true;
      gestureDirection = null;
      viewsSliderTrack.style.transition = 'none';
    }

    function onTouchMove(clientX, clientY) {
      if (!isTouching) return;
      touchCurrentX = clientX;
      touchCurrentY = clientY;

      const diffX = touchCurrentX - touchStartX;
      const diffY = touchCurrentY - touchStartY;

      // Determine direction once moved past 8px
      if (gestureDirection === null && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
        if (Math.abs(diffY) > Math.abs(diffX)) {
          gestureDirection = 'vertical';
        } else {
          gestureDirection = 'horizontal';
        }
      }

      // If horizontal, slide the tab track
      if (gestureDirection === 'horizontal') {
        const screenWidth = viewsOverlay.clientWidth || 380;
        let adjustedDiffX = diffX;
        if ((currentActiveTabIndex === 0 && diffX > 0) || (currentActiveTabIndex === 3 && diffX < 0)) {
          adjustedDiffX = diffX * 0.35;
        }
        const baseOffsetPct = -currentActiveTabIndex * 25;
        const diffPct = (adjustedDiffX / screenWidth) * 25;
        viewsSliderTrack.style.transform = `translateX(${baseOffsetPct + diffPct}%)`;
      }
    }

    function onTouchEnd() {
      if (!isTouching) return;
      isTouching = false;
      const diffX = touchCurrentX - touchStartX;
      const diffY = touchCurrentY - touchStartY;

      if (gestureDirection === 'vertical') {
        viewsSliderTrack.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2)';
        viewsSliderTrack.style.transform = `translateX(${-currentActiveTabIndex * 25}%)`;

        if (diffY < -40) {
          // SWIPE UP -> Open Search
          if (searchSwipeModal) {
            searchSwipeModal.classList.add('active');
            if (swipeSearchInput) {
              swipeSearchInput.focus();
              setTimeout(() => swipeSearchInput.focus(), 50);
              setTimeout(() => swipeSearchInput.focus(), 180);
            }
          }
        } else if (diffY > 40) {
          // SWIPE DOWN -> Open Money Report
          if (reportSwipeModal) {
            reportSwipeModal.classList.add('active');
          }
        }
      } else if (gestureDirection === 'horizontal') {
        // Horizontal tab switch
        viewsSliderTrack.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        if (diffX < -50 && currentActiveTabIndex < 3) {
          updateTabNavigation(currentActiveTabIndex + 1);
        } else if (diffX > 50 && currentActiveTabIndex > 0) {
          updateTabNavigation(currentActiveTabIndex - 1);
        } else {
          updateTabNavigation(currentActiveTabIndex);
        }
      } else {
        viewsSliderTrack.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        viewsSliderTrack.style.transform = `translateX(${-currentActiveTabIndex * 25}%)`;
      }

      touchStartX = 0; touchStartY = 0;
      touchCurrentX = 0; touchCurrentY = 0;
      gestureDirection = null;
    }

    viewsOverlay.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onTouchStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: true });

    viewsOverlay.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        onTouchMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    viewsOverlay.addEventListener('touchend', onTouchEnd, { passive: true });
    viewsOverlay.addEventListener('touchcancel', onTouchEnd, { passive: true });

    // Also support mouse for testing
    viewsOverlay.addEventListener('mousedown', (e) => onTouchStart(e.clientX, e.clientY, e.target));
    viewsOverlay.addEventListener('mousemove', (e) => onTouchMove(e.clientX, e.clientY));
    viewsOverlay.addEventListener('mouseup', onTouchEnd);
    viewsOverlay.addEventListener('mouseleave', onTouchEnd);
  }

  // ==========================================================================
  // UNIVERSAL MODAL SWIPE DOWN TO DISMISS
  // ==========================================================================
  function setupModalSwipeToDismiss() {
    const modals = document.querySelectorAll('.full-modal-overlay');
    modals.forEach(modal => {
      let mStartY = 0;
      let mStartX = 0;
      let mTouching = false;

      modal.addEventListener('touchstart', (e) => {
        // Don't intercept if scrolling inside a scrolled list unless at top
        const scrollBody = e.target.closest('.modal-body-scroll');
        if (scrollBody && scrollBody.scrollTop > 5) return;

        mStartY = e.touches[0].clientY;
        mStartX = e.touches[0].clientX;
        mTouching = true;
      }, { passive: true });

      modal.addEventListener('touchend', (e) => {
        if (!mTouching) return;
        mTouching = false;
        const diffY = e.changedTouches[0].clientY - mStartY;
        const diffX = e.changedTouches[0].clientX - mStartX;

        // Check if swipe is mostly vertical
        if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 40) {
          if (diffY > 40) {
            // Swiped DOWN -> Close modal
            modal.classList.remove('active');
          } else if (diffY < -40 && modal.id === 'reportSwipeModal') {
            // Swiped UP on report modal -> Close report
            modal.classList.remove('active');
          }
        }
      }, { passive: true });
    });
  }

  // Language Selection Modal Event Flow
  const changeLangBtn = document.getElementById('changeLangBtn');
  const languageModal = document.getElementById('languageModal');
  const closeLangModal = document.getElementById('closeLangModal');
  const saveLangBtn = document.getElementById('saveLangBtn');
  let selectedModalLang = "en";

  changeLangBtn?.addEventListener('click', () => {
    languageModal?.classList.add('active');
  });

  closeLangModal?.addEventListener('click', () => {
    languageModal?.classList.remove('active');
  });

  const langOptionCards = document.querySelectorAll('.lang-option-card');
  langOptionCards.forEach(card => {
    card.addEventListener('click', () => {
      langOptionCards.forEach(c => {
        c.classList.remove('active');
        const icon = c.querySelector('.lang-check-icon');
        if (icon) icon.setAttribute('data-lucide', 'circle');
      });
      card.classList.add('active');
      const icon = card.querySelector('.lang-check-icon');
      if (icon) icon.setAttribute('data-lucide', 'check-circle-2');

      selectedModalLang = card.getAttribute('data-lang');
      if (window.lucide) lucide.createIcons();
    });
  });

  saveLangBtn?.addEventListener('click', () => {
    applyLanguage(selectedModalLang);
    languageModal?.classList.remove('active');
  });

  // Initial Boot Render
  applyLanguage("en");
  setupIconSelector('walletIconSelector', 'wallet', (icon) => { selectedWalletIcon = icon; });
  updateTabNavigation(0);
  renderSubAccountCarousel();
  setupMainScreenGestures();
  setupModalSwipeToDismiss();
  updateDecimalLockUI();
});

