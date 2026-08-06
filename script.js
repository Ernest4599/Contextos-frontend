document.addEventListener('DOMContentLoaded', () => {

  /* ===== Device fingerprint =====
     A random ID generated once per device/browser, stored locally.
     Not tied to any personal info — just lets the backend track
     free-tier credits and license activation per device. */
  function getDeviceFingerprint(){
    let id = localStorage.getItem('contextos_device_id');
    if (!id){
      id = 'dev_' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('contextos_device_id', id);
    }
    return id;
  }

  /* ===== Package history (local, real) =====
     Every generated Context Package gets saved here — replaces the
     old fake "AI Memory OS" example. Stays entirely on-device,
     matching the existing local-first design; no backend call. */
  function getPackageHistory(){
    try {
      return JSON.parse(localStorage.getItem('contextos_packages') || '[]');
    } catch {
      return [];
    }
  }

  function savePackageToHistory({ title, prompt, source }){
    const history = getPackageHistory();
    history.unshift({
      id: 'pkg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      prompt,
      source, // 'import' | 'quick-prompt'
      createdAt: new Date().toISOString()
    });
    // Cap history length so localStorage doesn't grow unbounded
    const trimmed = history.slice(0, 50);
    localStorage.setItem('contextos_packages', JSON.stringify(trimmed));
  }


  /* ===== Backend URL (shared everywhere) ===== */
  const BACKEND_URL = 'https://contextos-apc7.onrender.com';

  /* ===== Supabase client (shared by sidebar + auth.html) =====
     ⚠️ Fill in your own Supabase project's URL and public anon key
     below. The anon key is SAFE to expose in frontend code — that's
     how Supabase's public key is designed to be used. Find both in
     your Supabase dashboard → Project Settings → API.
     Created once here; every page that loads supabase-js via CDN
     and includes this script reuses the same client. */
  const SUPABASE_URL = 'https://etytjdrcxekbsjamcxyg.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0eXRqZHJjeGVrYnNqYW1jeHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Mzk2MTgsImV4cCI6MjEwMTQxNTYxOH0.I00XQLx0dE6eOU3YMwYYO0VzyHwQV_5I1lF8S7NiyyU';
  const sb = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  /* ===== Sidebar profile row — reflects real login state =====
     Runs on every page that has the sidebar's avatar row. No-ops
     harmlessly on pages without one (like auth.html, which has its
     own dedicated logged-in/out UI instead). */
  async function updateSidebarProfile(){
    const nameEl = document.querySelector('.sb-profile-name');
    const subEl = document.querySelector('.sb-profile-sub');
    const avatarEl = document.querySelector('.sb-avatar');
    if (!nameEl || !subEl || !sb) return;

    const { data: { session } } = await sb.auth.getSession();
    if (session){
      nameEl.textContent = session.user.email;
      subEl.textContent = 'Signed in';
      if (avatarEl) avatarEl.textContent = session.user.email.charAt(0).toUpperCase();
    } else {
      nameEl.textContent = 'Guest';
      subEl.textContent = 'Tap to sign in';
      if (avatarEl) avatarEl.textContent = 'G';
    }
  }
  updateSidebarProfile();

  /* ===== Sidebar open/close (any page with #sidebar) ===== */
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const openBtn = document.getElementById('sidebarToggle');
  const closeBtn = document.getElementById('sidebarClose');

  function openSidebar(){
    if (!sidebar) return;
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
  }
  function closeSidebar(){
    if (!sidebar) return;
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
  }
  if (openBtn) openBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  const workspaceToggle = document.getElementById('workspaceToggle');
  if (workspaceToggle){
    workspaceToggle.addEventListener('click', () => {
      window.location.href = 'auth.html';
    });
  }

  /* ===== Home screen import actions -> go to Import screen ===== */
  const shareLinkBtn = document.getElementById('shareLinkBtn');
  if (shareLinkBtn){
    shareLinkBtn.addEventListener('click', () => {
      window.location.href = 'import.html';
    });
  }
  const pasteBtn = document.getElementById('pasteBtn');
  if (pasteBtn){
    pasteBtn.addEventListener('click', () => {
      window.location.href = 'import.html';
    });
  }
  const uploadBtnHome = document.getElementById('uploadBtn');
  if (uploadBtnHome){
    uploadBtnHome.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'import.html';
    });
  }

  /* ===== Project screen (package.html) ===== */
  const tabs = document.querySelectorAll('.proj-tab');
  const panels = document.querySelectorAll('.proj-panel');

  function showTab(tabName){
    tabs.forEach(t => t.classList.toggle('proj-tab--active', t.dataset.tab === tabName));
    panels.forEach(p => { p.hidden = p.dataset.panel !== tabName; });
  }
  tabs.forEach(tab => {
    tab.addEventListener('click', () => showTab(tab.dataset.tab));
  });
  document.querySelectorAll('[data-goto]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showTab(link.dataset.goto);
    });
  });

  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn){
    generateBtn.addEventListener('click', () => {
      window.location.href = 'context-package.html';
    });
  }
  const moreBtn = document.getElementById('moreBtn');
  if (moreBtn){
    moreBtn.addEventListener('click', () => {
      console.log('More options tapped');
    });
  }

  /* ===== Import screen ===== */
  const importOptions = document.querySelectorAll('.import-option');
  const continueBtn = document.getElementById('continueBtn');
  let importPayload = '';
  let importSource = null; // 'link' | 'paste' | 'file'

  function selectImportPanel(targetId){
    document.querySelectorAll('.import-panel').forEach(p => {
      p.hidden = (p.id !== targetId);
    });
  }
  importOptions.forEach(opt => {
    opt.addEventListener('click', () => selectImportPanel(opt.dataset.target));
  });

  const linkInput = document.getElementById('linkInput');
  const pasteInput = document.getElementById('pasteInput');
  const dropzone = document.getElementById('dropzone');
  const fileInputImport = document.getElementById('fileInput');
  const fileNameEl = document.getElementById('fileName');

  function refreshContinueState(){
    if (!continueBtn) return;
    const hasLink = linkInput && linkInput.value.trim().length > 0;
    const hasPaste = pasteInput && pasteInput.value.trim().length > 0;
    const hasFile = fileNameEl && fileNameEl.textContent.trim().length > 0;
    continueBtn.disabled = !(hasLink || hasPaste || hasFile);
  }

  if (linkInput){
    linkInput.addEventListener('input', () => {
      importPayload = linkInput.value.trim();
      importSource = 'link';
      refreshContinueState();
    });
  }
  if (pasteInput){
    pasteInput.addEventListener('input', () => {
      importPayload = pasteInput.value.trim();
      importSource = 'paste';
      refreshContinueState();
    });
  }
  if (dropzone && fileInputImport){
    dropzone.addEventListener('click', () => fileInputImport.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleImportFile(e.dataTransfer.files[0]);
    });
    fileInputImport.addEventListener('change', () => {
      if (fileInputImport.files.length) handleImportFile(fileInputImport.files[0]);
    });
  }

  function handleImportFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      importPayload = reader.result;
      importSource = 'file';
      if (fileNameEl) fileNameEl.textContent = `Selected: ${file.name}`;
      refreshContinueState();
    };
    reader.readAsText(file);
  }

  if (continueBtn){
    continueBtn.addEventListener('click', async () => {
      continueBtn.disabled = true;

      if (importSource === 'link'){
        // Actually use the backend's safe link-fetching endpoint instead
        // of sending the raw URL as if it were the conversation itself.
        continueBtn.textContent = 'Fetching link...';
        try {
          const res = await fetch(`${BACKEND_URL}/api/fetch-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: importPayload })
          });
          const data = await res.json();
          if (!res.ok){
            alert(data.error || 'Could not fetch that link.');
            continueBtn.disabled = false;
            continueBtn.textContent = 'Analyze Conversation';
            return;
          }
          localStorage.setItem('contextos_input', data.text || 'No content found at that link.');
        } catch (err){
          console.error('Link fetch failed:', err);
          alert('Could not reach the backend to fetch that link. Check your connection and try again.');
          continueBtn.disabled = false;
          continueBtn.textContent = 'Analyze Conversation';
          return;
        }
      } else {
        localStorage.setItem('contextos_input', importPayload || 'Untitled conversation import');
      }

      localStorage.setItem('contextos_start_time', Date.now().toString());
      window.location.href = 'processing.html';
    });
  }

  /* ===== Processing screen (fake backend simulation) ===== */
  const progressCircle = document.getElementById('progressCircle');
  const progressPercent = document.getElementById('progressPercent');
  const checklistItems = document.querySelectorAll('.checklist-item');

  if (progressCircle && checklistItems.length){
    const circumference = 553;
    const totalSteps = checklistItems.length;
    let step = 0;

    function runStep(){
      if (step > 0){
        checklistItems[step - 1].classList.remove('active');
        checklistItems[step - 1].classList.add('done');
      }
      if (step < totalSteps){
        checklistItems[step].classList.add('active');
        const percent = Math.round(((step + 1) / totalSteps) * 100);
        const offset = circumference - (circumference * percent / 100);
        progressCircle.style.strokeDashoffset = offset;
        progressPercent.textContent = percent + '%';
        step++;
        setTimeout(runStep, 650 + Math.random() * 400);
      } else {
        const rawInput = localStorage.getItem('contextos_input') || '';

        fetch(`${BACKEND_URL}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversation: rawInput,
            deviceFingerprint: getDeviceFingerprint(),
            projectId: getDeviceFingerprint() // ties each device to its OWN Project State, not a shared global one
          })
        })
        .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
        .then(({ ok, status, data }) => {
          if (status === 402){
            // Free/license credits exhausted — send to the real Purchase
            // screen instead of showing this as regular generated output.
            localStorage.removeItem('contextos_input');
            window.location.href = 'purchase.html?reason=limit';
            return;
          }
          if (!ok){
            // Real error from the backend (e.g. no AI credits, database
            // issue) — show the ACTUAL message instead of silently
            // pretending it succeeded.
            localStorage.setItem('contextos_output', data.error || 'The backend returned an error. Please try again.');
            localStorage.removeItem('contextos_input');
            window.location.href = 'context-package.html';
            return;
          }
          const prompt = data.prompt || 'No prompt returned by the backend.';
          localStorage.setItem('contextos_output', prompt);
          localStorage.removeItem('contextos_input');
          savePackageToHistory({
            title: 'Imported Conversation',
            prompt,
            source: 'import'
          });
          window.location.href = 'context-package.html';
        })
        .catch(err => {
          console.error('Backend request failed:', err);
          localStorage.setItem('contextos_output', 'Could not reach the backend at all. Check your internet connection and that the backend is deployed and running.');
          window.location.href = 'context-package.html';
        });
      }
    }
    setTimeout(runStep, 400);
  }

  /* ===== Output / Context Package screen ===== */
  const promptBox = document.getElementById('promptBox');
  if (promptBox){
    const output = localStorage.getItem('contextos_output') ||
`You are continuing a project called ContextOS.
(No conversation was imported — this is placeholder text.)`;
    promptBox.textContent = output;

    const charCount = document.getElementById('charCount');
    if (charCount) charCount.textContent = output.length.toLocaleString() + ' characters';

    const startTime = parseInt(localStorage.getItem('contextos_start_time'), 10);
    const generatedTime = document.getElementById('generatedTime');
    if (generatedTime){
      const seconds = startTime ? ((Date.now() - startTime) / 1000).toFixed(1) : (Math.random() * 10 + 4).toFixed(1);
      generatedTime.textContent = `Generated in ${seconds} seconds`;
    }

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn){
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(output).then(() => {
          copyBtn.classList.add('copied');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Prompt';
          }, 1800);
        });
      });
    }
  }

  /* ===== Account / Auth (auth.html) =====
     Reuses the shared `sb` client created at the top of this file. */
  const authForm = document.getElementById('authForm');
  if (authForm && sb){
    const emailField = document.getElementById('authEmail');
    const passwordField = document.getElementById('authPassword');
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');
    const tabs = document.querySelectorAll('.auth-tab');
    const loggedInState = document.getElementById('loggedInState');
    const loggedInEmail = document.getElementById('loggedInEmail');

    let mode = 'signin';

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        mode = tab.dataset.mode;
        tabs.forEach(t => t.classList.toggle('auth-tab--active', t === tab));
        submitBtn.textContent = mode === 'signin' ? 'Sign In' : 'Create Account';
        errorEl.hidden = true;
      });
    });

    function showAuthError(message){
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    async function refreshAuthUI(){
      const { data: { session } } = await sb.auth.getSession();
      if (session){
        authForm.hidden = true;
        loggedInState.hidden = false;
        loggedInEmail.textContent = session.user.email;
      } else {
        authForm.hidden = false;
        loggedInState.hidden = true;
      }
    }
    refreshAuthUI();

    submitBtn.addEventListener('click', async () => {
      const email = emailField.value.trim();
      const password = passwordField.value;
      if (!email || !password){
        showAuthError('Please enter both email and password.');
        return;
      }
      if (mode === 'signup' && password.length < 8){
        showAuthError('Password must be at least 8 characters.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Please wait...';

      const { error } = mode === 'signin'
        ? await sb.auth.signInWithPassword({ email, password })
        : await sb.auth.signUp({ email, password });

      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'signin' ? 'Sign In' : 'Create Account';

      if (error){
        showAuthError(error.message);
        return;
      }

      if (mode === 'signup'){
        alert('Check your email to confirm your account, then sign in.');
        return;
      }

      await refreshAuthUI();
    });

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn){
      signOutBtn.addEventListener('click', async () => {
        await sb.auth.signOut();
        await refreshAuthUI();
      });
    }

    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn){
      forgotPasswordBtn.addEventListener('click', async () => {
        const email = emailField.value.trim();
        if (!email){
          showAuthError('Enter your email above first, then tap "Forgot Password?"');
          return;
        }
        forgotPasswordBtn.disabled = true;
        forgotPasswordBtn.textContent = 'Sending...';

        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname.replace('auth.html', 'reset-password.html')
        });

        forgotPasswordBtn.disabled = false;
        forgotPasswordBtn.textContent = 'Forgot Password?';

        if (error){
          showAuthError(error.message);
          return;
        }
        alert('Check your email for a password reset link.');
      });
    }

    const linkLicenseBtn = document.getElementById('linkLicenseBtn');
    if (linkLicenseBtn){
      linkLicenseBtn.addEventListener('click', async () => {
        const licenseId = document.getElementById('linkLicenseId').value.trim();
        const recoveryKey = document.getElementById('linkRecoveryKey').value.trim();
        if (!licenseId || !recoveryKey){
          alert('Please enter both the License ID and Recovery Key.');
          return;
        }

        const { data: { session } } = await sb.auth.getSession();
        if (!session){
          alert('Please sign in first.');
          return;
        }


        try {
          const res = await fetch(`${BACKEND_URL}/api/account/link-license`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ licenseId, recoveryKey })
          });
          const data = await res.json();
          if (!res.ok){
            alert(data.error || 'Could not link license.');
            return;
          }
          alert(`License linked! Plan: ${data.plan}`);
        } catch (err){
          console.error('Link license failed:', err);
          alert('Could not reach the backend. Check your connection and try again.');
        }
      });
    }
  }

  /* ===== Packages screen (packages.html) ===== */
  const packagesList = document.getElementById('packagesList');
  if (packagesList){
    const packagesEmpty = document.getElementById('packagesEmpty');
    const history = getPackageHistory();

    if (history.length === 0){
      packagesEmpty.hidden = false;
    } else {
      history.forEach(pkg => {
        const item = document.createElement('button');
        item.className = 'package-item';

        const date = new Date(pkg.createdAt);
        const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
          ' · ' + date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        const sourceLabel = pkg.source === 'quick-prompt' ? 'Quick Prompt' : 'Import';
        const preview = pkg.prompt.replace(/\n/g, ' ').slice(0, 90);

        item.innerHTML = `
          <div class="package-item-title">${escapeHtml(pkg.title)}</div>
          <div class="package-item-meta">
            <span class="package-item-source">${sourceLabel}</span>
            <span>${dateStr}</span>
          </div>
          <div class="package-item-preview">${escapeHtml(preview)}...</div>
        `;

        item.addEventListener('click', () => {
          localStorage.setItem('contextos_output', pkg.prompt);
          localStorage.setItem('contextos_start_time', Date.now().toString());
          window.location.href = 'context-package.html';
        });

        packagesList.appendChild(item);
      });
    }

    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn){
      clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Delete all saved Context Packages from this device? This cannot be undone.')){
          localStorage.removeItem('contextos_packages');
          window.location.reload();
        }
      });
    }
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }


  /* ===== Restore License screen (restore-license.html) ===== */
  const restoreBtn = document.getElementById('restoreBtn');
  if (restoreBtn){
    const restoreLicenseId = document.getElementById('restoreLicenseId');
    const restoreRecoveryKey = document.getElementById('restoreRecoveryKey');
    const restoreError = document.getElementById('restoreError');

    function showRestoreError(message){
      restoreError.textContent = message;
      restoreError.hidden = false;
    }

    restoreBtn.addEventListener('click', () => {
      const licenseId = restoreLicenseId.value.trim();
      const recoveryKey = restoreRecoveryKey.value.trim();
      restoreError.hidden = true;

      if (!licenseId || !recoveryKey){
        showRestoreError('Please enter both the License ID and Recovery Key.');
        return;
      }


      restoreBtn.disabled = true;
      restoreBtn.textContent = 'Restoring...';

      fetch(`${BACKEND_URL}/api/license/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseId,
          recoveryKey,
          deviceFingerprint: getDeviceFingerprint()
        })
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        restoreBtn.disabled = false;
        restoreBtn.textContent = 'Restore License';

        if (!ok){
          showRestoreError(data.error || 'Could not restore this license.');
          return;
        }

        alert(`License restored! Plan: ${data.plan}. Credits remaining: ${data.creditsRemaining}`);
        window.location.href = 'mainsetting.html';
      })
      .catch(err => {
        console.error('Restore request failed:', err);
        restoreBtn.disabled = false;
        restoreBtn.textContent = 'Restore License';
        showRestoreError('Could not reach the backend. Check your connection and try again.');
      });
    });
  }


  /* ===== Settings screen ===== */
  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn){
    clearDataBtn.addEventListener('click', async () => {
      const confirmed = confirm('This will permanently delete all locally stored data (device ID, saved packages) and sign you out if logged in. This cannot be undone. Continue?');
      if (confirmed){
        if (sb){
          const { data: { session } } = await sb.auth.getSession();
          if (session) await sb.auth.signOut();
        }
        localStorage.clear();
        alert('All local data cleared.');
        window.location.href = 'home.html';
      }
    });
  }

  const aboutRow = document.getElementById('aboutRow');
  if (aboutRow){
    aboutRow.addEventListener('click', () => {
      alert('ContextOS v1.0.0\n\nTurn any AI conversation into a reusable Context Package.\n\nPrivate by design. No account required. Your conversations are never stored.');
    });
  }

  const quickGenerateBtn = document.getElementById('quickGenerateBtn');
  if (quickGenerateBtn){
    const overviewField = document.getElementById('qpOverview');
    const decisionsField = document.getElementById('qpDecisions');
    const taskField = document.getElementById('qpTask');

    function refreshQuickPromptState(){
      const hasOverview = overviewField.value.trim().length > 0;
      const hasTask = taskField.value.trim().length > 0;
      // Overview + Task are the minimum needed to generate something useful;
      // Decisions is optional (matches "keeps AI from changing direction" —
      // useful, not mandatory)
      quickGenerateBtn.disabled = !(hasOverview && hasTask);
    }
    [overviewField, decisionsField, taskField].forEach(field => {
      field.addEventListener('input', refreshQuickPromptState);
    });
    refreshQuickPromptState();

    quickGenerateBtn.addEventListener('click', () => {

      quickGenerateBtn.disabled = true;
      quickGenerateBtn.textContent = 'Generating...';

      fetch(`${BACKEND_URL}/api/quick-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overview: overviewField.value.trim(),
          decisions: decisionsField.value.trim(),
          task: taskField.value.trim(),
          deviceFingerprint: getDeviceFingerprint()
        })
      })
      .then(res => res.json().then(data => ({ ok: res.ok, status: res.status, data })))
      .then(({ ok, status, data }) => {
        if (status === 402){
          window.location.href = 'purchase.html?reason=limit';
          return;
        }
        if (!ok){
          alert(data.error || 'Something went wrong generating your prompt.');
          quickGenerateBtn.disabled = false;
          quickGenerateBtn.textContent = 'Generate Context Package';
          return;
        }
        localStorage.setItem('contextos_output', data.prompt);
        localStorage.setItem('contextos_start_time', Date.now().toString());
        savePackageToHistory({
          title: overviewField.value.trim().slice(0, 60) || 'Quick Prompt',
          prompt: data.prompt,
          source: 'quick-prompt'
        });
        window.location.href = 'context-package.html';
      })
      .catch(err => {
        console.error('Quick Prompt request failed:', err);
        alert('Could not reach the backend. Check your connection and try again.');
        quickGenerateBtn.disabled = false;
        quickGenerateBtn.textContent = 'Generate Context Package';
      });
    });
  }

  /* ===== Purchase screen (purchase.html) ===== */
  const buyProBtn = document.getElementById('buyProBtn');
  if (buyProBtn){
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reason') === 'limit'){
      const titleEl = document.getElementById('purchaseTitle');
      const subEl = document.getElementById('purchaseSub');
      if (titleEl) titleEl.textContent = "You've used your free generations";
      if (subEl) subEl.textContent = 'Get Pro to keep creating Context Packages.';
    }

    const purchaseError = document.getElementById('purchaseError');

    buyProBtn.addEventListener('click', () => {
      purchaseError.hidden = true;
      buyProBtn.disabled = true;
      buyProBtn.textContent = 'Redirecting...';

      fetch(`${BACKEND_URL}/api/license/purchase/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'starter' })
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok){
          purchaseError.textContent = data.error || 'Could not start payment.';
          purchaseError.hidden = false;
          buyProBtn.disabled = false;
          buyProBtn.textContent = 'Pay with Paystack';
          return;
        }
        // Save the reference so purchase-success.html can verify this
        // exact payment once Paystack redirects back
        localStorage.setItem('contextos_pending_reference', data.reference);
        window.location.href = data.authorizationUrl;
      })
      .catch(err => {
        console.error('Purchase init failed:', err);
        purchaseError.textContent = 'Could not reach the backend. Check your connection and try again.';
        purchaseError.hidden = false;
        buyProBtn.disabled = false;
        buyProBtn.textContent = 'Pay with Paystack';
      });
    });
  }

  /* ===== Purchase Success screen (purchase-success.html) ===== */
  const verifyingState = document.getElementById('verifyingState');
  if (verifyingState){
    const successState = document.getElementById('successState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');

    function showPurchaseError(message){
      verifyingState.hidden = true;
      errorState.hidden = false;
      errorMessage.textContent = message;
    }

    const urlParams2 = new URLSearchParams(window.location.search);
    const reference = urlParams2.get('reference') || urlParams2.get('trxref') || localStorage.getItem('contextos_pending_reference');

    if (!reference){
      showPurchaseError('No payment reference found. If you completed a payment, please contact support with your payment details.');
    } else {
      fetch(`${BACKEND_URL}/api/license/purchase/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, deviceFingerprint: getDeviceFingerprint() })
      })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok){
          showPurchaseError(data.error || 'Could not verify your payment.');
          return;
        }

        localStorage.removeItem('contextos_pending_reference');
        verifyingState.hidden = true;
        successState.hidden = false;

        document.getElementById('licenseIdBox').textContent = data.licenseId || '(already issued — check your records)';
        document.getElementById('recoveryKeyBox').textContent = data.recoveryKey || '(not shown again — contact support if lost)';

        const copyBothBtn = document.getElementById('copyBothBtn');
        if (copyBothBtn){
          copyBothBtn.addEventListener('click', () => {
            const text = `License ID: ${data.licenseId}\nRecovery Key: ${data.recoveryKey}`;
            navigator.clipboard.writeText(text).then(() => {
              copyBothBtn.textContent = 'Copied!';
              setTimeout(() => { copyBothBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy Both'; }, 1800);
            });
          });
        }

        const continueHomeBtn = document.getElementById('continueHomeBtn');
        if (continueHomeBtn){
          continueHomeBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
          });
        }
      })
      .catch(err => {
        console.error('Purchase verify failed:', err);
        showPurchaseError('Could not reach the backend to verify your payment. If you were charged, please contact support.');
      });
    }
  }

  /* ===== Reset Password screen (reset-password.html) ===== */
  const setPasswordBtn = document.getElementById('setPasswordBtn');
  if (setPasswordBtn && sb){
    const newPasswordField = document.getElementById('newPassword');
    const resetError = document.getElementById('resetError');

    setPasswordBtn.addEventListener('click', async () => {
      const newPassword = newPasswordField.value;
      resetError.hidden = true;

      if (!newPassword || newPassword.length < 8){
        resetError.textContent = 'Password must be at least 8 characters.';
        resetError.hidden = false;
        return;
      }

      setPasswordBtn.disabled = true;
      setPasswordBtn.textContent = 'Saving...';

      const { error } = await sb.auth.updateUser({ password: newPassword });

      setPasswordBtn.disabled = false;
      setPasswordBtn.textContent = 'Set New Password';

      if (error){
        resetError.textContent = error.message;
        resetError.hidden = false;
        return;
      }

      alert('Password updated! Please sign in with your new password.');
      window.location.href = 'auth.html';
    });
  }

  /* ===== My License screen (license.html) ===== */
  const licenseLoading = document.getElementById('licenseLoading');
  if (licenseLoading){
    const licenseContent = document.getElementById('licenseContent');
    const planLabel = document.getElementById('planLabel');
    const creditsLabel = document.getElementById('creditsLabel');
    const licenseIdRow = document.getElementById('licenseIdRow');
    const licenseIdLabel = document.getElementById('licenseIdLabel');
    const buyCreditsBtn = document.getElementById('buyCreditsBtn');
    const getProLink = document.getElementById('getProLink');
    const licenseError = document.getElementById('licenseError');

    fetch(`${BACKEND_URL}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceFingerprint: getDeviceFingerprint() })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      licenseLoading.hidden = true;
      licenseContent.hidden = false;

      if (!ok){
        licenseError.textContent = data.error || 'Could not check your license status.';
        licenseError.hidden = false;
        return;
      }

      if (data.licensed){
        planLabel.textContent = `${data.plan.charAt(0).toUpperCase()}${data.plan.slice(1)} Plan`;
        creditsLabel.textContent = `${data.creditsRemaining} imports remaining`;
        licenseIdRow.hidden = false;
        licenseIdLabel.textContent = data.licenseId || '—';
        buyCreditsBtn.hidden = false;

        buyCreditsBtn.addEventListener('click', () => {
          buyCreditsBtn.disabled = true;
          buyCreditsBtn.textContent = 'Redirecting...';

          fetch(`${BACKEND_URL}/api/license/purchase/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'credits100', licenseId: data.licenseId })
          })
          .then(res => res.json().then(d => ({ ok: res.ok, data: d })))
          .then(({ ok: initOk, data: initData }) => {
            if (!initOk){
              licenseError.textContent = initData.error || 'Could not start payment.';
              licenseError.hidden = false;
              buyCreditsBtn.disabled = false;
              buyCreditsBtn.textContent = 'Buy 100 More Credits — ₦7,000';
              return;
            }
            localStorage.setItem('contextos_pending_reference', initData.reference);
            window.location.href = initData.authorizationUrl;
          })
          .catch(err => {
            console.error('Credit top-up init failed:', err);
            licenseError.textContent = 'Could not reach the backend. Check your connection and try again.';
            licenseError.hidden = false;
            buyCreditsBtn.disabled = false;
            buyCreditsBtn.textContent = 'Buy 100 More Credits — ₦7,000';
          });
        });
      } else {
        planLabel.textContent = 'Free Plan';
        creditsLabel.textContent = `${data.creditsRemaining} free imports remaining`;
        getProLink.hidden = false;
      }
    })
    .catch(err => {
      console.error('License verify failed:', err);
      licenseLoading.hidden = true;
      licenseContent.hidden = false;
      licenseError.textContent = 'Could not reach the backend to check your license status.';
      licenseError.hidden = false;
    });
  }

});
