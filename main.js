// main.js - enhanced interactive behaviors
document.addEventListener("DOMContentLoaded", () => {
  /******************************
   * 1. Original validation (kept)
   ******************************/
  const form = document.getElementById("recommenderForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      // client-side validation: numeric fields and slider weights sum
      const score = parseFloat(form.raw_score.value);
      const budget = parseFloat(form.budget.value);
      const w_grade = parseFloat(document.getElementById('w_grade').value || 0);
      const w_budget = parseFloat(document.getElementById('w_budget').value || 0);
      const w_interest = parseFloat(document.getElementById('w_interest').value || 0);
      const w_country = parseFloat(document.getElementById('w_country').value || 0);
      const sumW = w_grade + w_budget + w_interest + w_country;
      // remove existing error
      const existing = document.querySelector('.form-error');
      if (existing) existing.remove();
      if (isNaN(score) || isNaN(budget)) {
        const msg = 'Please enter valid numbers: Score and Budget must be numeric.';
        const container = document.querySelector('.container');
        const err = document.createElement('div'); err.className = 'form-error'; err.textContent = msg;
        container.insertBefore(err, container.firstChild);
        e.preventDefault();
        return false;
      }
      // validate score bounds depending on selected type
      const stype = (document.getElementById('score_type')?.value || 'OSSD').toUpperCase();
      const maxAllowed = (stype === 'IB') ? 45 : 100;
      if (isNaN(score) || score < 0 || score > maxAllowed) {
        const msg = `Please enter a valid score (${stype}): 0 - ${maxAllowed}.`;
        const container = document.querySelector('.container');
        const err = document.createElement('div'); err.className = 'form-error'; err.textContent = msg;
        container.insertBefore(err, container.firstChild);
        e.preventDefault();
        return false;
      }
      if (sumW <= 0) {
        const msg = 'Please select valid weights: the sum of all 4 weight sliders must be greater than 0.';
        const container = document.querySelector('.container');
        const err = document.createElement('div'); err.className = 'form-error'; err.textContent = msg;
        container.insertBefore(err, container.firstChild);
        e.preventDefault();
        return false;
      }
      // ensure user didn't leave an unadded tag in the add-field
      const interestInput = document.getElementById('interestInput');
      const countryInput = document.getElementById('countryInput');
      if (interestInput && interestInput.value.trim()) {
        const container = document.querySelector('.container');
        const err = document.createElement('div'); err.className = 'form-error'; err.textContent = 'You have an unadded interest. Press Enter to add it or clear the field before submitting.';
        container.insertBefore(err, container.firstChild);
        e.preventDefault();
        return false;
      }
      if (countryInput && countryInput.value.trim()) {
        const container = document.querySelector('.container');
        const err = document.createElement('div'); err.className = 'form-error'; err.textContent = 'You have an unadded country. Press Enter to add it or clear the field before submitting.';
        container.insertBefore(err, container.firstChild);
        e.preventDefault();
        return false;
      }
      return true;
    });
  }

  /******************************
   * 2. Theme toggle (improved)
   ******************************/
  function applyTheme(theme) {
    // only support 'light' and 'dark'
    document.body.classList.remove("theme-dark");
    if (theme === "dark") document.body.classList.add("theme-dark");
    localStorage.setItem("urs_theme", theme);
  }

  // restore theme from storage
  const savedTheme = localStorage.getItem("urs_theme") || "light";
  applyTheme(savedTheme);

  // navbar theme selector
  const navThemeSelect = document.getElementById("navThemeSelect");
  if (navThemeSelect) {
    navThemeSelect.value = (savedTheme === "dark") ? "dark" : "light";
    navThemeSelect.addEventListener("change", (e) => {
      const v = e.target.value;
      applyTheme(v === 'dark' ? 'dark' : 'light');
    });
  }

  // smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /******************************
   * 3. Weight preview badges (live update)
   ******************************/
  // Setup sliders: update the visible percentage text beside each
  const sliders = ["w_grade", "w_budget", "w_interest", "w_country"];
  // helper: choose color by value range
  function sliderColorForValue(v) {
    if (v <= 33) return '#e74c3c';
    if (v <= 66) return '#f1c40f';
    // try to read CSS var for brand-blue; fallback to hex
    const cssBlue = getComputedStyle(document.documentElement).getPropertyValue('--brand-blue').trim();
    return cssBlue || '#0F6393';
  }

  function setSliderFill(el) {
    const min = parseFloat(el.min) || 0;
    const max = parseFloat(el.max) || 100;
    const v = parseFloat(el.value) || 0;
    const pct = Math.round((v - min) / (max - min) * 100);
    const color = sliderColorForValue(v);
    el.style.background = `linear-gradient(90deg, ${color} ${pct}%, rgba(0,0,0,0.08) ${pct}%)`;
  }

  sliders.forEach(name => {
    const el = document.getElementById(name);
    const disp = document.getElementById('v_' + name);
    if (!el || !disp) return;
    disp.textContent = el.value;
    // initialize visual fill
    setSliderFill(el);
    el.addEventListener('input', () => {
      disp.textContent = el.value;
      // update fill color and percentage
      setSliderFill(el);
      // small pulse effect
      disp.style.transform = 'scale(1.05)';
      setTimeout(() => disp.style.transform = 'scale(1)', 150);
    });
    // while dragging show white thumb; remove on release
    el.addEventListener('pointerdown', () => {
      el.classList.add('dragging');
    });
  });
  // pointerup anywhere should clear dragging state from all sliders
  document.addEventListener('pointerup', () => {
    sliders.forEach(n => {
      const s = document.getElementById(n);
      if (s) s.classList.remove('dragging');
    });
  });

  // add pulse animation to CSS
  if (!document.getElementById("pulse-animation")) {
    const style = document.createElement("style");
    style.id = "pulse-animation";
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  /******************************
   * Score help & validation
   ******************************/
  const scoreTypeEl = document.getElementById('score_type');
  const rawScoreEl = document.getElementById('raw_score');
  const scoreHelpEl = document.getElementById('scoreHelp');
  function updateScoreHelp() {
    const type = (scoreTypeEl?.value || 'OSSD').toUpperCase();
    if (!rawScoreEl || !scoreHelpEl) return;
    if (type === 'IB') {
      rawScoreEl.placeholder = 'Enter IB score (0 - 45) — e.g. 36';
      rawScoreEl.min = 0; rawScoreEl.max = 45; scoreHelpEl.textContent = 'IB scores are out of 45 (e.g., 36). Enter a number between 0 and 45.';
    } else {
      rawScoreEl.placeholder = 'Enter OSSD score (0 - 100) — e.g. 90';
      rawScoreEl.min = 0; rawScoreEl.max = 100; scoreHelpEl.textContent = 'OSSD scores are out of 100 (e.g., 90). Enter a number between 0 and 100.';
    }
  }
  if (scoreTypeEl) scoreTypeEl.addEventListener('change', updateScoreHelp);
  updateScoreHelp();

  /******************************
   * Tag input behavior (interests & countries)
   ******************************/
  function setupTagInput(inputId, tagsContainerId, hiddenName) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(tagsContainerId);
    if (!input || !container) return;

    function makeTag(value) {
      const span = document.createElement('span');
      span.className = 'tag';
      span.dataset.value = value;
      span.innerHTML = `${value} <button type="button" class="tag-remove" aria-label="Remove">×</button>`;
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.name = hiddenName; hidden.value = value;
      span.appendChild(hidden);
      container.appendChild(span);
      span.querySelector('.tag-remove').addEventListener('click', () => span.remove());
    }

    // attach remove handlers for any pre-rendered tags
    container.querySelectorAll('.tag .tag-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const p = e.target.closest('.tag'); if (p) p.remove();
      });
    });

    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        makeTag(v);
        input.value = '';
      }
    });
  }
  setupTagInput('interestInput', 'interestTags', 'interests');
  setupTagInput('countryInput', 'countryTags', 'countries');

  /******************************
   * 4. Enhance results table (if present)
   ******************************/
  function enhanceResultsTable() {
    const table = document.querySelector("table");
    if (!table) return;

    // Conflict avoidance: if specific results page UI exists (filter-bar), 
    // do not run this generic enhancement to avoid double-binding or logic conflicts.
    if (document.querySelector('.filter-bar')) return;

    // Insert client-side controls above table if not exist
    let tableCard = table.closest(".table-card");
    if (!tableCard) {
      tableCard = document.createElement("div");
      tableCard.className = "table-card";
      table.parentNode.insertBefore(tableCard, table);
      tableCard.appendChild(table);
    }

    // add filter UI
    if (!document.getElementById("clientFilters")) {
      const filters = document.createElement("div");
      filters.id = "clientFilters";
      filters.className = "control";
      filters.style.marginBottom = "16px";
      filters.style.display = "flex";
      filters.style.gap = "12px";
      filters.style.flexWrap = "wrap";
      filters.innerHTML = `
        <label class="small" style="margin: 0;">Min Match:
          <input id="minScore" type="range" min="0" max="100" value="0" step="1" style="width:140px; vertical-align:middle;">
          <span id="minScoreVal" class="meta-small">0</span>
        </label>
        <label class="small" style="margin: 0;">Country:
          <input id="clientCountryFilter" placeholder="Filter country..." style="width:130px;">
        </label>
        <button id="exportVisible" class="secondary" style="margin: 0;">Export visible CSV</button>
      `;
      tableCard.insertBefore(filters, table);

      // events
      const minScore = document.getElementById("minScore");
      const minScoreVal = document.getElementById("minScoreVal");
      const countryFilter = document.getElementById("clientCountryFilter");
      minScore.addEventListener("input", () => {
        minScoreVal.textContent = minScore.value;
        applyFilters();
      });
      countryFilter.addEventListener("input", applyFilters);

      document.getElementById("exportVisible").addEventListener("click", () => {
        exportVisibleCSV();
      });
    }

    // convert match score cells to progress bars
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    rows.forEach((row, idx) => {
      // skip if already enhanced
      if (row.dataset.enhanced) return;
      const cells = row.querySelectorAll("td");
      const matchCell = cells[1];
      if (!matchCell) return;
      const raw = parseFloat(matchCell.textContent) || 0;

      // create progress bar container
      const wrap = document.createElement("div");
      wrap.className = "match-cell";
      const bar = document.createElement("div");
      bar.className = "match-bar";
      const fill = document.createElement("div");
      let cls = "low";
      if (raw >= 85) cls = "high";
      else if (raw >= 70) cls = "med";
      else if (raw >= 50) cls = "low";
      else cls = "verylow";
      fill.className = `fill ${cls}`;
      fill.style.width = "0%";
      fill.textContent = `${raw}`;
      bar.appendChild(fill);
      wrap.appendChild(bar);

      // replace matchCell content
      matchCell.textContent = "";
      matchCell.appendChild(wrap);

      // animate fill on next tick with staggered timing
      setTimeout(() => { fill.style.width = Math.max(3, raw) + "%"; }, 50 + idx * 30);

      // copy-on-click for university name cell
      const nameCell = cells[0];
      if (nameCell) {
        nameCell.style.cursor = "pointer";
        nameCell.title = "Click to copy university name";
        nameCell.addEventListener("click", () => {
          navigator.clipboard?.writeText(nameCell.textContent.trim());
          const original = nameCell.style.backgroundColor;
          nameCell.style.backgroundColor = "rgba(46, 204, 113, 0.2)";
          setTimeout(() => nameCell.style.backgroundColor = original, 300);
        });
      }

      // store enhanced flag
      row.dataset.enhanced = "1";
    });

    // add simple column sorting on header click
    const headers = table.querySelectorAll("thead th");
    headers.forEach((th, idx) => {
      th.style.cursor = "pointer";
      th.title = "Click to sort";
      th.addEventListener("click", () => {
        sortTableByColumn(table, idx);
      });
    });

    // run initial filters
    applyFilters();
  } // end enhanceResultsTable

  // helper: filters
  function applyFilters() {
    const table = document.querySelector("table");
    if (!table) return;
    const minScore = parseInt(document.getElementById("minScore")?.value || 0, 10);
    const country = (document.getElementById("clientCountryFilter")?.value || "").trim().toLowerCase();
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    rows.forEach(row => {
      let score = 0;
      const fill = row.querySelector(".match-bar .fill");
      if (fill) score = parseFloat(fill.textContent) || 0;
      const countryCell = row.querySelectorAll("td")[6];
      const ctext = countryCell ? countryCell.textContent.trim().toLowerCase() : "";
      const okScore = score >= minScore;
      const okCountry = country === "" || ctext.includes(country);
      row.style.display = (okScore && okCountry) ? "" : "none";
    });
  }

  // helper: export visible rows to CSV (client-side)
  function exportVisibleCSV() {
    const table = document.querySelector("table");
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tbody tr")).filter(r => r.style.display !== "none");
    const csv = [];
    const headers = Array.from(table.querySelectorAll("thead th")).map(h => h.textContent.trim());
    csv.push(headers.map(h => `"${h}"`).join(","));
    rows.forEach(r => {
      const cols = Array.from(r.querySelectorAll("td")).map(td => {
        const text = td.textContent.replace(/"/g, '""').trim();
        return `"${text}"`;
      });
      csv.push(cols.join(","));
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visible_recommendations.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // helper: simple column sorter
  function sortTableByColumn(table, colIndex) {
    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const sorted = rows.sort((a, b) => {
      const aText = (a.querySelectorAll("td")[colIndex]?.textContent || "").trim();
      const bText = (b.querySelectorAll("td")[colIndex]?.textContent || "").trim();
      const aNum = parseFloat(aText);
      const bNum = parseFloat(bText);
      if (!isNaN(aNum) && !isNaN(bNum)) return bNum - aNum;
      return aText.localeCompare(bText);
    });
    // append in new order with animation
    sorted.forEach((r, idx) => {
      r.style.animation = "none";
      setTimeout(() => {
        r.style.animation = `slideInUp 0.3s ease-out ${idx * 20}ms`;
        tbody.appendChild(r);
      }, 10);
    });
  }

  /******************************
   * 5. Run enhancements on page load
   ******************************/
  // Enhance results if results exist
  enhanceResultsTable();

}); // DOMContentLoaded end

// --- Back button behavior ---
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      document.body.style.transition = "opacity 0.3s ease";
      document.body.style.opacity = "0";
      setTimeout(() => {
        window.location.href = "/";
      }, 300);
    });
  }
});
