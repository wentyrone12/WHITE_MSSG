(() => {
  let deferredInstallPrompt = null;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const injectStyles = () => {
    if (document.getElementById("pwa-inline-style")) return;
    const style = document.createElement("style");
    style.id = "pwa-inline-style";
    style.textContent = `
      .pwa-install-bar{position:fixed;left:14px;right:14px;bottom:14px;z-index:100000;display:flex;align-items:center;gap:12px;padding:13px 14px;border:1px solid rgba(0,255,136,.35);border-radius:18px;background:rgba(7,7,9,.94);backdrop-filter:blur(18px);box-shadow:0 16px 44px rgba(0,0,0,.45);color:#fff}
      .pwa-install-bar.hidden{display:none!important}
      .pwa-install-text{flex:1;min-width:0}.pwa-install-title{font-weight:800;font-size:14px}.pwa-install-sub{margin-top:3px;color:#a8b0ba;font-size:11px;line-height:1.35}
      .pwa-install-action{border:0;border-radius:12px;padding:10px 14px;font-weight:800;background:#00ff88;color:#00170c;cursor:pointer;white-space:nowrap}
      .pwa-install-close{border:0;background:transparent;color:#9aa0a6;font-size:18px;padding:5px;cursor:pointer}
      .pwa-install-settings-btn{display:flex;align-items:center;justify-content:center;width:100%;margin-top:10px}
      @media(min-width:901px){.pwa-install-bar{max-width:430px;left:auto}}
    `;
    document.head.appendChild(style);
  };

  const showToastBar = (title, sub, actionLabel, onAction) => {
    injectStyles();
    let bar = document.getElementById("pwaInstallBar");
    if (bar) bar.remove();
    bar = document.createElement("div");
    bar.id = "pwaInstallBar";
    bar.className = "pwa-install-bar";
    bar.innerHTML = `
      <div class="pwa-install-text"><div class="pwa-install-title"></div><div class="pwa-install-sub"></div></div>
      <button class="pwa-install-action" type="button"></button>
      <button class="pwa-install-close" type="button" aria-label="Close">✕</button>
    `;
    bar.querySelector(".pwa-install-title").textContent = title;
    bar.querySelector(".pwa-install-sub").textContent = sub;
    bar.querySelector(".pwa-install-action").textContent = actionLabel;
    bar.querySelector(".pwa-install-action").addEventListener("click", async () => {
      await onAction();
    });
    bar.querySelector(".pwa-install-close").addEventListener("click", () => bar.remove());
    document.body.appendChild(bar);
  };

  const install = async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    const bar = document.getElementById("pwaInstallBar");
    if (bar) bar.remove();
    updateSettingsInstallButton();
  };

  const installInstructions = () => {
    if (!isIOS) return;
    showToastBar(
      "Install WHITE_MSSG",
      "iPhone/iPad: tap Share, then “Add to Home Screen”.",
      "Got it",
      async () => {
        const bar = document.getElementById("pwaInstallBar");
        if (bar) bar.remove();
      }
    );
  };

  const addSettingsInstallButton = () => {
    const settingsCard = document.querySelector(".settings-card-large");
    if (!settingsCard || document.getElementById("installAppBtn")) return;

    const section = document.createElement("div");
    section.className = "setting-section pwa-install-settings";
    section.innerHTML = `
      <h3>📱 App Install</h3>
      <p style="color:#9aa0a6;font-size:.82rem;line-height:1.5;margin-bottom:10px">Install WHITE_MSSG on your phone for an app-like experience.</p>
      <button id="installAppBtn" class="btn-primary pwa-install-settings-btn" type="button">Install WHITE_MSSG</button>
    `;
    const saveButton = settingsCard.querySelector('button[onclick="saveSettings()"]');
    if (saveButton) settingsCard.insertBefore(section, saveButton);
    else settingsCard.appendChild(section);

    updateSettingsInstallButton();
    document.getElementById("installAppBtn").addEventListener("click", () => {
      if (deferredInstallPrompt) install();
      else if (isIOS) installInstructions();
      else alert("Your browser can install this app from its menu when the site is opened over HTTPS.");
    });
  };

  const updateSettingsInstallButton = () => {
    const btn = document.getElementById("installAppBtn");
    if (!btn) return;
    if (isStandalone) {
      btn.textContent = "✓ Installed on this device";
      btn.disabled = true;
      btn.style.opacity = ".7";
      return;
    }
    btn.disabled = false;
    btn.textContent = deferredInstallPrompt ? "Install WHITE_MSSG" : (isIOS ? "How to Install on iPhone" : "Install WHITE_MSSG");
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateSettingsInstallButton();

    if (!sessionStorage.getItem("whiteMssgInstallHint")) {
      sessionStorage.setItem("whiteMssgInstallHint", "1");
      showToastBar("Install WHITE_MSSG", "Add it to your home screen for a faster app-like launch.", "Install", install);
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    const bar = document.getElementById("pwaInstallBar");
    if (bar) bar.remove();
    updateSettingsInstallButton();
  });

  window.addEventListener("DOMContentLoaded", () => {
    addSettingsInstallButton();
    if (isStandalone) document.documentElement.classList.add("pwa-standalone");

    // Re-attempt when the settings overlay is dynamically used.
    const observer = new MutationObserver(() => addSettingsInstallButton());
    observer.observe(document.body, { childList: true, subtree: true });

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", async () => {
        try {
          const registration = await navigator.serviceWorker.register("./sw.js", { scope: "./" });
          if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                worker.postMessage("SKIP_WAITING");
              }
            });
          });
        } catch (error) {
          console.warn("WHITE_MSSG PWA registration failed:", error);
        }
      });
    }
  });
})();
