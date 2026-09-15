const URLS = {
  calendar:  '/proxy/mstr7p.aspx',
  booking:   '/proxy/mstr7a.aspx',
  schedules: '/proxy/mstr8.aspx',
  account:   '/proxy/mstr1.aspx',
};

const TITLES = {
  calendar:  'Club Calendar',
  booking:   'Reserve / Modify',
  schedules: 'My Bookings',
  account:   'My Account',
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── Install banner ──
const banner   = document.getElementById('install-banner');
const isIOS    = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches;

if (!isStandalone) {
  if (isIOS) {
    banner.classList.add('visible');
    document.getElementById('install-text').textContent =
      '📲 Tap Share ↑ then "Add to Home Screen" to install';
    document.getElementById('install-btn').style.display = 'none';
  } else {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      let prompt = e;
      banner.classList.add('visible');
      document.getElementById('install-btn').addEventListener('click', async () => {
        prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') banner.classList.remove('visible');
      });
    });
    window.addEventListener('appinstalled', () => banner.classList.remove('visible'));
  }
}

// ── Screen navigation ──
const homeScreen  = document.getElementById('screen-home');
const schedScreen = document.getElementById('screen-scheduler');
const frame       = document.getElementById('scheduler-frame');
const pageTitle   = document.getElementById('page-title');

function openPage(key) {
  pageTitle.textContent = TITLES[key];
  frame.src = URLS[key];

  homeScreen.classList.add('behind');
  schedScreen.classList.add('active');
}

function goHome() {
  schedScreen.classList.remove('active');
  homeScreen.classList.remove('behind');
  // keep frame alive so session persists if user comes back
}

function reloadScheduler() {
  frame.src = frame.src;
}
