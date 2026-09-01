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
      add_account: "Add Account",
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
      add_account: "ගිණුමක් එකතු කරන්න",
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
      add_account: "ඇකවුන්ට් ඩිපොසිට්",
      switch_accounts: "චේන්ජ් ඇකවුන්ට්ස්"
    }
  };

  let categoryTitlesMap = {
    wallets: "Wallets",
    bank_debit: "Bank Accounts & Debit Cards",
    living_budget: "Living Budget",
    custom: "Custom",
    topup_wallet: "Top-up Wallet"
  };

  function applyLanguage(lang) {
    currentLang = lang;
    const t = translations[lang] || translations.en;

    categoryTitlesMap = {
      wallets: t.wallets,
      bank_debit: t.bank_debit,
      living_budget: t.living_budget,
      custom: t.custom,
      topup_wallet: t.topup_wallet
    };

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

    renderSubAccountCarousel();
  }

  let subAccountsData = {
    wallets: [
      { id: "w1", title: "Main Cash Wallet", icon: "wallet", active: true, order: 0, balance: 185500.00, type: "cash_balance", subtitle: "Primary Liquid Cash" },
      { id: "w2", title: "Budget for Wallet", icon: "pie-chart", active: true, order: 1, spent: 42000.00, limit: 60000.00, type: "budget_progress", subtitle: "Monthly Cash Budget" },
      { id: "w3", title: "Loans (Cash Borrowed)", icon: "circle-dollar-sign", active: true, order: 2, balance: 25000.00, type: "loan", subtitle: "Borrowed Cash Outstanding" },
      { id: "w4", title: "Someone's Money", icon: "users", active: true, order: 3, balance: 15000.00, type: "escrow", subtitle: "Third-Party Held Cash" },
      { id: "w5", title: "Custom Sub-Wallet", icon: "sliders", active: false, order: 4, balance: 50000.00, type: "custom", tag: "Emergency Cash Vault" }
    ],
    bank_debit: [
      { id: "b1", title: "Bank Accounts", icon: "landmark", active: true, order: 0, balance: 650200.00, type: "bank_balance", subtitle: "Commercial Bank Savings" },
      { id: "b2", title: "Debit Cards", icon: "credit-card", active: true, order: 1, balance: 120000.00, type: "debit_card", subtitle: "Linked Debit Account" },
      { id: "b3", title: "Credit Cards", icon: "credit-card", active: true, order: 2, limit: 300000.00, used: 45000.00, type: "credit_card", subtitle: "Visa Platinum Limit" },
      { id: "b4", title: "Card/Bank Budget", icon: "pie-chart", active: true, order: 3, spent: 28000.00, limit: 50000.00, type: "budget_progress", subtitle: "Digital Spending Allocation" },
      { id: "b5", title: "Loans", icon: "circle-dollar-sign", active: false, order: 4, balance: 150000.00, type: "loan", subtitle: "Bank Loan Balance" },
      { id: "b6", title: "Someone's Money", icon: "users", active: false, order: 5, balance: 20000.00, type: "escrow", subtitle: "Escrow Bank Deposit" },
      { id: "b7", title: "Custom Sub-Account", icon: "sliders", active: false, order: 6, balance: 75000.00, type: "custom", tag: "High-Yield Vault" }
    ],
    living_budget: [
      { id: "lb1", title: "Wallet Budget", icon: "wallet", active: true, order: 0, spent: 45000.00, limit: 60000.00, type: "budget_progress", subtitle: "Cash Living Expense" },
      { id: "lb2", title: "Bank/Debit Budget", icon: "landmark", active: true, order: 1, spent: 80000.00, limit: 120000.00, type: "budget_progress", subtitle: "Direct Debit Utilities" },
      { id: "lb3", title: "Credit Card Budget", icon: "credit-card", active: true, order: 2, spent: 35000.00, limit: 50000.00, type: "budget_progress", subtitle: "Card Living Spend" },
      { id: "lb4", title: "Loans Budget", icon: "circle-dollar-sign", active: false, order: 3, spent: 50000.00, limit: 75000.00, type: "budget_progress", subtitle: "Debt Repayment Allowance" },
      { id: "lb5", title: "Custom Time-Range Budget", icon: "calendar", active: true, order: 4, type: "time_range", activeRange: "1 Month", ranges: { "1 Month": { spent: 145000.00, limit: 200000.00 }, "Multi-Month": { spent: 410000.00, limit: 600000.00 }, "1 Year": { spent: 1850000.00, limit: 2400000.00 } } }
    ],
    custom: [
      { id: "c1", title: "Vault & Emergency Reserve", icon: "sliders", active: true, order: 0, balance: 520000.00, type: "custom", tag: "Yield: 11.5% p.a." },
      { id: "c2", title: "Investment Reserve Goal", icon: "pie-chart", active: true, order: 1, spent: 520000.00, limit: 1000000.00, type: "budget_progress", subtitle: "52% Goal Reached" },
      { id: "c3", title: "Secondary Savings Sub-Vault", icon: "wallet", active: false, order: 2, balance: 140000.00, type: "cash_balance", subtitle: "Fixed Deposit Reserve" }
    ],
    topup_wallet: [
      { id: "t1", title: "Transit Card", icon: "bus", active: true, order: 0, balance: 1500.00, type: "cash_balance", subtitle: "Metro/Bus Wallet" }
    ]
  };

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
    });

    accountCategoryDropdownMenu.querySelectorAll('.dropdown-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        accountCategoryDropdownMenu.querySelectorAll('.dropdown-menu-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        currentDropdownCategory = item.getAttribute('data-cat');
        if (dropdownCategoryTitle) {
          dropdownCategoryTitle.textContent = categoryTitlesMap[currentDropdownCategory] || "Wallets";
        }

        accountCategoryDropdownBtn.classList.remove('open');
        accountCategoryDropdownMenu.classList.remove('open');
        activeSubAccountIndex = 0;
        renderSubAccountCarousel();
      });
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    accountCategoryDropdownBtn?.classList.remove('open');
    accountCategoryDropdownMenu?.classList.remove('open');
    infoTooltip?.classList.remove('show');
  });

  // Tooltip dismissal safely
  infoBubbleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    infoTooltip?.classList.toggle('show');
    if (tooltipTimeoutId) clearTimeout(tooltipTimeoutId);
    if (infoTooltip?.classList.contains('show')) {
      tooltipTimeoutId = setTimeout(() => {
        infoTooltip?.classList.remove('show');
      }, 5000);
    }
  });

  // Balance Masking Toggle safely replacing innerHTML
  maskToggleBtn?.addEventListener('click', () => {
    isBalanceMasked = !isBalanceMasked;
    maskToggleBtn.innerHTML = '<i data-lucide="' + (isBalanceMasked ? 'eye-off' : 'eye') + '" id="eyeIcon"></i>';
    if (window.lucide) lucide.createIcons();
    renderSubAccountCarousel();
  });

  function formatMoney(amount) {
    if (isBalanceMasked) return "LKR ••••••";
    return `LKR ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getActiveSubAccounts() {
    const list = subAccountsData[currentDropdownCategory] || [];
    return list.filter(acc => acc.active).sort((a, b) => a.order - b.order);
  }

  // --- 2. RENDER SWIPABLE CAROUSEL (ACTIVE "SHOWS LIST" ITEMS ONLY) ---
  function renderSubAccountCarousel() {
    if (!cardCarouselSurface || !accountCardDots) return;
    cardCarouselSurface.innerHTML = '';
    accountCardDots.innerHTML = '';

    const activeSubAccounts = getActiveSubAccounts();
    if (activeSubAccounts.length === 0) {
      cardCarouselSurface.innerHTML = `
        <div class="account-card-view" style="text-align: center; padding: 24px;">
          <p style="color: #64748b; font-weight: 600; font-size: 0.9rem;">No sub-accounts in "Shows List" for this category.</p>
          <button class="primary-btn" id="manageSubAccsBtn" style="margin-top: 10px; width: 190px; height: 36px;">Manage Accounts</button>
        </div>
      `;
      document.getElementById('manageSubAccsBtn')?.addEventListener('click', () => {
        renderGlobalAccountsManager();
        document.getElementById('globalAccountsModal')?.classList.add('active');
      });
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

      if (subAcc.type === 'cash_balance' || subAcc.type === 'bank_balance' || subAcc.type === 'debit_card' || subAcc.type === 'loan' || subAcc.type === 'escrow') {
        bodyContent = `
          <div class="card-balance-header">
            <span class="balance-label-sm">${subAcc.subtitle || 'Available Balance'}</span>
            <div class="card-balance-display">${formatMoney(subAcc.balance)}</div>
          </div>
          <div style="font-size: 0.74rem; font-weight: 600; color: #475569; background: rgba(255, 255, 255, 0.4); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: space-between;">
            <span>Category Option:</span>
            <strong style="color: #0f172a;">${subAcc.title}</strong>
          </div>
        `;
      }
      else if (subAcc.type === 'credit_card') {
        const pct = Math.min(100, Math.round((subAcc.used / subAcc.limit) * 100));
        bodyContent = `
          <div class="card-balance-header">
            <span class="balance-label-sm">Credit Line Used</span>
            <div class="card-balance-display" style="color: #ef4444;">${formatMoney(subAcc.used)}</div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info-row">
              <span>Card Limit: ${formatMoney(subAcc.limit)}</span>
              <span>${pct}% used</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${pct > 80 ? 'warning' : ''}" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }
      else if (subAcc.type === 'budget_progress') {
        const pct = Math.min(100, Math.round((subAcc.spent / subAcc.limit) * 100));
        bodyContent = `
          <div class="card-balance-header">
            <span class="balance-label-sm">Spent Allocation</span>
            <div class="card-balance-display">${formatMoney(subAcc.spent)}</div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-info-row">
              <span>Limit: ${formatMoney(subAcc.limit)}</span>
              <span>${pct}% used</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${pct > 80 ? 'warning' : ''}" style="width: ${pct}%;"></div>
            </div>
          </div>
        `;
      }
      else if (subAcc.type === 'custom') {
        bodyContent = `
          <div class="card-balance-header">
            <span class="balance-label-sm">Custom Reserve Balance</span>
            <div class="card-balance-display">${formatMoney(subAcc.balance)}</div>
          </div>
          <div style="font-size: 0.74rem; font-weight: 600; color: #475569; background: rgba(255, 255, 255, 0.4); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.5); display: flex; align-items: center; gap: 6px;">
            <i data-lucide="tag" style="width: 12px; height: 12px;"></i> ${subAcc.tag || 'Custom Account Tag'}
          </div>
        `;
      }
      else if (subAcc.type === 'time_range') {
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
              <span>Budget Limit: ${formatMoney(currentData.limit)}</span>
              <span>${pct}% used</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${pct > 80 ? 'warning' : ''}" style="width: ${pct}%;"></div>
            </div>
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
      }

      cardEl.innerHTML = `
        <div class="card-top-row">
          <div class="card-title-badge">
            <i data-lucide="${subAcc.icon}"></i> ${subAcc.title}
          </div>
          <button class="card-corner-edit open-edit-trigger" title="Sub-Account Settings">
            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
        ${bodyContent}
      `;

      track.appendChild(cardEl);
    });

    cardCarouselSurface.appendChild(track);

    // Attach card corner edit trigger listener safely (Button 2: Sub-Account Settings)
    cardCarouselSurface.querySelectorAll('.open-edit-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderSubAccountSettings();
      });
    });

    // Render Sub-account Pagination Dots with Morphing Bouncy Pill
    if (activeSubAccounts.length > 0) {
      activeSubAccounts.forEach((subAcc, idx) => {
        const dot = document.createElement('span');
        dot.className = `acc-dot ${idx === activeSubAccountIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => {
          activeSubAccountIndex = idx;
          updateCarouselPosition();
        });
        accountCardDots.appendChild(dot);
      });
    }

    updateCarouselPosition();
    if (window.lucide) lucide.createIcons();
    setupSwipeGestures();
  }

  function updateCarouselPosition() {
    const track = document.getElementById('carouselTrack');
    if (track) {
      track.style.transform = `translateX(-${activeSubAccountIndex * 100}%)`;
    }

    if (!accountCardDots) return;
    const dots = accountCardDots.querySelectorAll('.acc-dot');
    dots.forEach((dot, idx) => {
      if (idx === activeSubAccountIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // --- 3. SUB-ACCOUNT CAROUSEL SWIPE & ELASTIC BOUNCING PHYSICS ---
  function setupSwipeGestures() {
    if (!cardCarouselSurface) return;
    const track = document.getElementById('carouselTrack');
    if (!track) return;

    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    function handleStart(clientX) {
      startX = clientX;
      currentX = clientX;
      isDragging = true;
      track.style.transition = 'none';
    }

    function handleMove(clientX) {
      if (!isDragging) return;
      currentX = clientX;
      let diffX = currentX - startX;
      const activeSubAccounts = getActiveSubAccounts();
      const cardWidth = cardCarouselSurface.clientWidth || 340;

      if ((activeSubAccountIndex === 0 && diffX > 0) || 
          (activeSubAccountIndex === activeSubAccounts.length - 1 && diffX < 0)) {
        diffX = diffX * 0.3;
      }

      const baseOffset = -activeSubAccountIndex * cardWidth;
      track.style.transform = `translateX(${baseOffset + diffX}px)`;
    }

    function handleEnd() {
      if (!isDragging) return;
      isDragging = false;
      track.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      const diffX = currentX - startX;
      const activeSubAccounts = getActiveSubAccounts();

      if (diffX < -45 && activeSubAccountIndex < activeSubAccounts.length - 1) {
        activeSubAccountIndex++;
      } else if (diffX > 45 && activeSubAccountIndex > 0) {
        activeSubAccountIndex--;
      }
      updateCarouselPosition();
      startX = 0; currentX = 0;
    }

    cardCarouselSurface.ontouchstart = (e) => handleStart(e.touches[0].clientX);
    cardCarouselSurface.ontouchmove = (e) => handleMove(e.touches[0].clientX);
    cardCarouselSurface.ontouchend = handleEnd;

    cardCarouselSurface.onmousedown = (e) => handleStart(e.clientX);
    cardCarouselSurface.onmousemove = (e) => handleMove(e.clientX);
    cardCarouselSurface.onmouseup = cardCarouselSurface.onmouseleave = handleEnd;
  }

  // --- 4. BUTTON 1: GLOBAL ACCOUNTS MANAGER MODAL (Collapsed Accordions & Inline Renaming) ---
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

    Object.keys(subAccountsData).forEach(catKey => {
      const subList = subAccountsData[catKey];
      const isCurrentCat = catKey === currentDropdownCategory;

      const accordion = document.createElement('div');
      accordion.className = `category-accordion ${isCurrentCat ? 'open' : ''}`;

      accordion.innerHTML = `
        <div class="accordion-header">
          <div class="accordion-header-left">
            <i data-lucide="${catIcons[catKey] || 'folder'}"></i>
            <input type="text" class="rename-input-field cat-rename-input" data-cat="${catKey}" value="${categoryTitlesMap[catKey] || catKey}" title="Edit Main Account Title" />
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="visibility-count-badge">${subList.filter(s => s.active).length}/${subList.length} Active</span>
            <i data-lucide="chevron-down" class="accordion-chevron"></i>
          </div>
        </div>
        <div class="accordion-body">
          <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-bottom:4px;">Drag Handle to Reorder • Rename Inline • Toggle Visibility:</div>
          ${subList.map((subAcc) => `
            <div class="acc-manage-row" draggable="true" data-id="${subAcc.id}" data-cat="${catKey}" style="padding:8px 12px; display:flex; align-items:center; gap:8px; touch-action:none;">
              <i data-lucide="grip-vertical" class="drag-handle-btn" style="cursor: grab; color: #94a3b8; margin-right: 4px; touch-action: none;"></i>

              <div class="acc-manage-info" style="flex:1; display:flex; align-items:center; gap:8px;">
                <i data-lucide="${subAcc.icon}" style="color:${subAcc.active ? 'var(--accent-blue)' : '#64748b'};"></i>
                <input type="text" class="rename-input-field sub-rename-input" data-cat="${catKey}" data-id="${subAcc.id}" value="${subAcc.title}" title="Rename Sub-Account" />
              </div>

              <label class="toggle-switch" title="Show / Hide in Main Carousel">
                <input type="checkbox" class="global-visibility-check" data-cat="${catKey}" data-id="${subAcc.id}" ${subAcc.active ? 'checked' : ''}>
                <span class="slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      `;

      // 1. Exclusive Accordion Logic (Single Open at a Time)
      const headerEl = accordion.querySelector('.accordion-header');
      headerEl?.addEventListener('click', (e) => {
        if (e.target.classList.contains('cat-rename-input')) return;
        const isAlreadyOpen = accordion.classList.contains('open');

        // Close all other accordions first
        globalAccountsModalBody.querySelectorAll('.category-accordion').forEach(acc => {
          acc.classList.remove('open');
        });

        // Toggle clicked accordion if it wasn't open
        if (!isAlreadyOpen) {
          accordion.classList.add('open');
        }
      });

      // Main Category Rename Input Listener
      accordion.querySelector('.cat-rename-input')?.addEventListener('input', (e) => {
        const val = e.target.value;
        categoryTitlesMap[catKey] = val;
        if (catKey === currentDropdownCategory && dropdownCategoryTitle) {
          dropdownCategoryTitle.textContent = val;
        }
        renderSubAccountCarousel();
      });

      // Sub-Account Rename Inputs Listener
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

      // 2. Visibility Toggle Handler
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

      // 3. Desktop HTML5 Drag-and-Drop & Mobile Touch Drag Logic
      const accordionBody = accordion.querySelector('.accordion-body');
      const rows = accordion.querySelectorAll('.acc-manage-row');

      rows.forEach(row => {
        // Desktop HTML5 Drag Handlers
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
            if (offset > 0) {
              accordionBody.insertBefore(draggingRow, row.nextSibling);
            } else {
              accordionBody.insertBefore(draggingRow, row);
            }
          }
        });

        // Mobile Touch Event Mapping on Drag Handle
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
              if (offset > 0) {
                accordionBody.insertBefore(row, targetRow.nextSibling);
              } else {
                accordionBody.insertBefore(row, targetRow);
              }
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

  // --- 5. BUTTON 2: SUB-ACCOUNT SETTINGS MODAL (Scoped strictly to currently visible card) ---
  closeSubAccSettingsModal?.addEventListener('click', () => {
    subAccountSettingsModal?.classList.remove('active');
  });

  function renderSubAccountSettings() {
    const activeSubAccounts = getActiveSubAccounts();
    if (activeSubAccounts.length === 0) return;

    const activeSubAcc = activeSubAccounts[activeSubAccountIndex] || activeSubAccounts[0];
    if (!activeSubAcc) return;

    const subAccSettingsTitle = document.getElementById('subAccSettingsTitle');
    const subAccTitleInput = document.getElementById('subAccTitleInput');
    const subAccSubtitleInput = document.getElementById('subAccSubtitleInput');
    const subAccBalanceInput = document.getElementById('subAccBalanceInput');
    const subAccLimitInput = document.getElementById('subAccLimitInput');
    const subAccTagInput = document.getElementById('subAccTagInput');

    if (subAccSettingsTitle) subAccSettingsTitle.textContent = `Settings: ${activeSubAcc.title}`;
    if (subAccTitleInput) subAccTitleInput.value = activeSubAcc.title || '';
    if (subAccSubtitleInput) subAccSubtitleInput.value = activeSubAcc.subtitle || '';
    if (subAccBalanceInput) subAccBalanceInput.value = activeSubAcc.balance !== undefined ? activeSubAcc.balance : '';
    if (subAccLimitInput) subAccLimitInput.value = activeSubAcc.limit !== undefined ? activeSubAcc.limit : (activeSubAcc.spent !== undefined ? activeSubAcc.spent : '');
    if (subAccTagInput) subAccTagInput.value = activeSubAcc.tag || '';

    subAccountSettingsModal?.classList.add('active');
  }

  subAccountSettingsForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const activeSubAccounts = getActiveSubAccounts();
    const activeSubAcc = activeSubAccounts[activeSubAccountIndex];
    if (activeSubAcc) {
      const subAccTitleInput = document.getElementById('subAccTitleInput');
      const subAccSubtitleInput = document.getElementById('subAccSubtitleInput');
      const subAccBalanceInput = document.getElementById('subAccBalanceInput');
      const subAccLimitInput = document.getElementById('subAccLimitInput');
      const subAccTagInput = document.getElementById('subAccTagInput');

      if (subAccTitleInput) activeSubAcc.title = subAccTitleInput.value;
      if (subAccSubtitleInput) activeSubAcc.subtitle = subAccSubtitleInput.value;
      if (activeSubAcc.balance !== undefined && subAccBalanceInput) activeSubAcc.balance = parseFloat(subAccBalanceInput.value) || 0;
      if (activeSubAcc.spent !== undefined && subAccLimitInput) activeSubAcc.spent = parseFloat(subAccLimitInput.value) || 0;
      if (activeSubAcc.limit !== undefined && subAccLimitInput) activeSubAcc.limit = parseFloat(subAccLimitInput.value) || 0;
      if (activeSubAcc.tag !== undefined && subAccTagInput) activeSubAcc.tag = subAccTagInput.value;
    }
    subAccountSettingsModal?.classList.remove('active');
    renderSubAccountCarousel();
  });

  // --- 6. "SWITCH ACCOUNTS" BUTTON: DISPLAY & VISIBILITY MANAGER MODAL (Show/Hide Toggles & Quick Jump) ---
  if (switchAccountsBtn && switchAccountsModal) {
    switchAccountsBtn.addEventListener('click', () => {
      renderVisibilityManager();
      switchAccountsModal.classList.add('active');
    });
  }

  closeSwitchModal?.addEventListener('click', () => {
    switchAccountsModal?.classList.remove('active');
  });

  saveVisibilityBtn?.addEventListener('click', () => {
    switchAccountsModal?.classList.remove('active');
    renderSubAccountCarousel();
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
                <i data-lucide="${subAcc.icon}" style="color:${subAcc.active ? 'var(--accent-blue)' : '#64748b'};"></i>
                <div>
                  <h5>${subAcc.title}</h5>
                  <p>${subAcc.subtitle || 'Sub-Account'}</p>
                </div>
              </div>
              <label class="toggle-switch" title="Show / Hide in Carousel">
                <input type="checkbox" class="visibility-toggle-check" data-cat="${catKey}" data-id="${subAcc.id}" ${subAcc.active ? 'checked' : ''}>
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

      accordion.querySelectorAll('.visibility-toggle-check').forEach(checkbox => {
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

  // --- 7. ADD ACCOUNT FORM FLOW ---
  addAccountBtn?.addEventListener('click', () => {
    addAccountModal?.classList.add('active');
  });

  closeAddModal?.addEventListener('click', () => {
    addAccountModal?.classList.remove('active');
  });

  newAccountForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('newAccName');
    const categoryInput = document.getElementById('newAccCategory');
    const balanceInput = document.getElementById('newAccBalance');

    const name = nameInput ? nameInput.value : 'New Account';
    const category = categoryInput ? categoryInput.value : 'Cash';
    const balance = balanceInput ? parseFloat(balanceInput.value) || 0 : 0;

    const newSubAcc = {
      id: "custom_" + Date.now(),
      title: name,
      icon: "wallet",
      active: true,
      order: (subAccountsData[currentDropdownCategory] || []).length,
      balance: balance,
      type: "cash_balance",
      subtitle: category
    };

    if (!subAccountsData[currentDropdownCategory]) subAccountsData[currentDropdownCategory] = [];
    subAccountsData[currentDropdownCategory].push(newSubAcc);
    newAccountForm.reset();
    addAccountModal?.classList.remove('active');
    renderSubAccountCarousel();
  });

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
      if (glow) glow.remove();

      if (itemIndex === currentActiveTabIndex) {
        item.classList.add('active');
        const activeGlow = document.createElement('span');
        activeGlow.className = 'active-glow';
        item.appendChild(activeGlow);
      } else {
        item.classList.remove('active');
      }
    });

    if (swipeIndicator) {
      swipeIndicator.innerHTML = '';
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

  // Dark Theme Toggle safely
  const themeCheckbox = document.getElementById('themeCheckbox');
  themeCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  });

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
  const quickAddTrigger = document.getElementById('quickAddTrigger');
  const quickAddEmptyModal = document.getElementById('quickAddEmptyModal');
  const closeQuickAddEmptyBtn = document.getElementById('closeQuickAddEmptyBtn');
  const typeCapsule = document.querySelector('.type-input-capsule');
  const plusBtn = document.querySelector('.plus-btn');

  function openQuickAddModal(autoFocus = false) {
    if (!quickAddEmptyModal) return;
    quickAddEmptyModal.classList.add('active');
    if (autoFocus && transactionAmount) {
      transactionAmount.focus();
      if (isDecimalLocked) {
        positionCursorBeforeCents(transactionAmount);
      } else {
        transactionAmount.select();
      }
      setTimeout(() => {
        transactionAmount.focus();
        if (isDecimalLocked) positionCursorBeforeCents(transactionAmount);
      }, 50);
      setTimeout(() => {
        transactionAmount.focus();
        if (isDecimalLocked) positionCursorBeforeCents(transactionAmount);
      }, 150);
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

  // Quick Add Account Selector Chips Logic
  const accChips = document.querySelectorAll('.acc-chip');
  accChips.forEach(chip => {
    chip?.addEventListener('click', (e) => {
      accChips.forEach(c => c.classList.remove('active'));
      const clickedBtn = e.target.closest('.acc-chip') || e.target;
      clickedBtn.classList.add('active');
    });
  });

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
              setTimeout(() => swipeSearchInput.focus(), 150);
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
  updateTabNavigation(0);
  renderSubAccountCarousel();
  setupMainScreenGestures();
  setupModalSwipeToDismiss();
  updateDecimalLockUI();
});

