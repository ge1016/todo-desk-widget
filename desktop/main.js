const { app, BrowserWindow, ipcMain, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/* 自愈：若被 ELECTRON_RUN_AS_NODE 影响，Electron 会被当成纯 Node 跑（require('electron') 拿不到 API）。
   这里检测到就清掉该变量，重新以真正的 Electron 进程拉起自己。 */
if (!app) {
  if (process.env.TODO_WIDGET_RELAUNCH !== '1') {
    try {
      const { spawn } = require('child_process');
      const env = Object.assign({}, process.env);
      delete env.ELECTRON_RUN_AS_NODE;
      delete env.NODE_OPTIONS;
      env.TODO_WIDGET_RELAUNCH = '1';
      spawn(process.execPath, [__dirname], { env: env, detached: true, stdio: 'ignore' }).unref();
    } catch (e) { /* 忽略 */ }
  }
  process.exit(0);
}

const PAGE_URL = 'https://www.workbuddy.cn/space/d/YOUR_PAGE_NODE_ID';
const APP_DIR = path.resolve(__dirname);
const ICON = path.join(__dirname, 'icon.png');

/* 排障开关：工作区存在 diag.flag 时，把渲染层日志与 iframe DOM 快照写到 ../diag.log。
   日常运行无此文件，零开销。 */
const DIAG_FILE = path.join(__dirname, '..', 'diag.log');
const DIAG_ON = fs.existsSync(path.join(__dirname, '..', 'diag.flag'));
function diagLog(s) {
  if (!DIAG_ON) { return; }
  try { fs.appendFileSync(DIAG_FILE, '[' + new Date().toISOString() + '] ' + s + '\n'); } catch (e) { /* 忽略 */ }
}
if (DIAG_ON) { try { fs.writeFileSync(DIAG_FILE, ''); } catch (e) { /* 忽略 */ } }

let win = null;
let stateFile = null;
let saveTimer = null;
let loginMode = false;
let preLoginBounds = null;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

function writeState(obj) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(obj), 'utf8');
  } catch (e) {
    /* 磁盘不可写时静默降级，不影响窗口使用 */
  }
}

function persist(patch) {
  const next = Object.assign({}, readState(), patch);
  writeState(next);
  return next;
}

/* ---------- 注入窗口外壳（拖拽条 + 窗口按钮） ---------- */

const SHELL_CSS = [
  'html body{padding-top:26px !important;box-sizing:border-box}',
  '#tbshell-drag{position:fixed;top:0;left:0;right:0;height:26px;z-index:2147483000;',
  '-webkit-app-region:drag;display:flex;align-items:center;padding-left:11px;',
  'background:linear-gradient(180deg,rgba(244,248,255,.97),rgba(244,248,255,.86));',
  'border-bottom:1px solid rgba(22,45,90,.07);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}',
  '#tbshell-drag span{font-size:11px;color:#93a0b3;letter-spacing:.04em;user-select:none}',
  '#tbshell-btns{position:fixed;top:0;right:0;height:26px;display:flex;align-items:center;gap:2px;',
  'padding-right:4px;z-index:2147483001;-webkit-app-region:no-drag}',
  '#tbshell-btns button{width:24px;height:20px;display:flex;align-items:center;justify-content:center;',
  'border:0;border-radius:6px;background:transparent;color:#8b97a8;cursor:pointer;padding:0;transition:background .14s,color .14s}',
  '#tbshell-btns button:hover{background:rgba(20,45,90,.09);color:#3b4a60}',
  '#tbshell-btns button.on{color:#2f6bff;background:rgba(47,107,255,.13)}',
  '#tbshell-btns button[data-act="close"]:hover{background:#e5484d;color:#fff}',
  '#tbshell-offline{position:fixed;inset:0;z-index:2147482000;display:flex;align-items:center;justify-content:center;',
  'flex-direction:column;gap:10px;background:#f4f8ff;font:13px/1.6 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif;color:#5d6b80}',
  '#tbshell-offline button{font:inherit;padding:8px 18px;border-radius:9px;border:1px solid rgba(47,107,255,.35);',
  'background:#fff;color:#2f6bff;cursor:pointer}',
  '::-webkit-scrollbar{width:8px;height:8px}',
  '::-webkit-scrollbar-track{background:transparent}',
  '::-webkit-scrollbar-thumb{background:rgba(20,45,90,.18);border-radius:8px}',
  '::-webkit-scrollbar-thumb:hover{background:rgba(20,45,90,.28)}'
].join('');

const SVG_PIN = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 1.9 14.1 6.4l-2.2.4-2.5 2.5.3 2.1-1.1 1.1-4.6-4.6 1.1-1.1 2.1.3 2.5-2.5.4-2.2Z"/><path d="M5.3 10.7 2.1 13.9"/></svg>';
const SVG_MIN = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3.6 8h8.8"/></svg>';
const SVG_CLOSE = '<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6"/></svg>';

function shellScript(onTop) {
  return '(function(){' +
    'if(document.getElementById("tbshell-drag")){return;}' +
    'var api=window.todoShell||{};' +
    'var drag=document.createElement("div");drag.id="tbshell-drag";' +
    'var lb=document.createElement("span");lb.textContent="我的待办台";drag.appendChild(lb);' +
    'var bar=document.createElement("div");bar.id="tbshell-btns";' +
    'function mk(act,title,svg,cls){var b=document.createElement("button");b.type="button";' +
    'b.setAttribute("data-act",act);b.title=title;b.innerHTML=svg;if(cls){b.className=cls;}' +
    'b.addEventListener("click",function(ev){ev.preventDefault();ev.stopPropagation();' +
    'if(act==="pin"&&api.togglePin){api.togglePin();}if(act==="min"&&api.minimize){api.minimize();}' +
    'if(act==="close"&&api.close){api.close();}});bar.appendChild(b);return b;}' +
    'var pin=mk("pin","切换置顶",' + JSON.stringify(SVG_PIN) + ',' + (onTop ? '"on"' : '""') + ');' +
    'mk("min","最小化",' + JSON.stringify(SVG_MIN) + ',null);' +
    'mk("close","关闭",' + JSON.stringify(SVG_CLOSE) + ',null);' +
    'document.documentElement.appendChild(drag);document.documentElement.appendChild(bar);' +
    '})();';
}

function setPinUI(onTop) {
  if (!win || win.isDestroyed()) return;
  win.webContents.executeJavaScript(
    '(function(){var b=document.querySelector(\'#tbshell-btns [data-act="pin"]\');' +
    'if(b){if(' + (onTop ? 'true' : 'false') + '){b.classList.add("on");}else{b.classList.remove("on");}}})();'
  ).catch(function () { /* 页面尚未就绪时忽略 */ });
}

function injectShell(w) {
  w.webContents.insertCSS(SHELL_CSS).catch(function () { /* 忽略 */ });
  w.webContents.executeJavaScript(shellScript(w.isAlwaysOnTop())).catch(function () { /* 忽略 */ });
}

/* ---------- 登录态：未登录时放大窗口，登录后收回小窗 ---------- */

function checkAuthState(url) {
  if (!win || win.isDestroyed() || !url) return;
  const needLogin = /\/login|\/auth\/realms|\/logout/i.test(url);
  if (needLogin && !loginMode) {
    enterLoginMode();
  } else if (!needLogin && /\/space\//.test(url) && loginMode) {
    exitLoginMode();
  }
}

function enterLoginMode() {
  if (!win || win.isDestroyed()) return;
  loginMode = true;
  preLoginBounds = win.getBounds();
  const area = screen.getPrimaryDisplay().workAreaSize;
  const w = Math.min(1000, Math.max(700, area.width - 120));
  const h = Math.min(840, Math.max(600, area.height - 100));
  win.setBounds({
    x: Math.round((area.width - w) / 2),
    y: Math.round((area.height - h) / 2),
    width: w,
    height: h
  });
  win.setAlwaysOnTop(true, 'floating');
  console.log('[widget] 未登录，窗口已放大，等待登录');
}

function exitLoginMode() {
  if (!win || win.isDestroyed()) return;
  loginMode = false;
  const st = readState();
  const area = screen.getPrimaryDisplay().workAreaSize;
  const w = clamp(st.width || 430, 340, Math.max(360, area.width - 40));
  const h = clamp(st.height || 720, 420, Math.max(480, area.height - 40));
  const x = Number.isInteger(st.x) ? st.x : Math.max(0, area.width - w - 36);
  const y = Number.isInteger(st.y) ? st.y : Math.max(16, Math.round(area.height * 0.07));
  win.setBounds({ x: x, y: y, width: w, height: h });
  console.log('[widget] 已登录，窗口恢复小窗模式');
}

/* ---------- 窗口 ---------- */

function createWindow() {
  const st = readState();
  const area = screen.getPrimaryDisplay().workAreaSize;
  const width = clamp(st.width || 430, 340, Math.max(360, area.width - 40));
  const height = clamp(st.height || 720, 420, Math.max(480, area.height - 40));
  let x = Number.isInteger(st.x) ? st.x : Math.max(0, area.width - width - 36);
  let y = Number.isInteger(st.y) ? st.y : Math.max(16, Math.round(area.height * 0.07));
  x = clamp(x, -width + 90, area.width - 90);
  y = clamp(y, 0, area.height - 70);
  const onTop = st.alwaysOnTop !== false;

  win = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    minWidth: 340,
    minHeight: 420,
    frame: false,
    show: true,
    alwaysOnTop: onTop,
    backgroundColor: '#f4f8ff',
    title: '我的待办台',
    icon: ICON,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false
    }
  });

  win.setAlwaysOnTop(onTop, 'floating');
  win.setMenuBarVisibility(false);
  /* 网页标题会覆盖窗口标题（任务栏/Alt-Tab 里会显示成网页名），锁死为「我的待办台」 */
  win.on('page-title-updated', function (e) { e.preventDefault(); });
  win.loadURL(PAGE_URL);

  win.webContents.on('console-message', function (e, level, message) {
    const msg = (e && e.message) ? e.message : message;
    if (msg) { console.log('[renderer] ' + msg); diagLog('[renderer:' + level + '] ' + msg); }
  });

  win.webContents.on('did-finish-load', function () {
    win.webContents.executeJavaScript(
      '(function(){return JSON.stringify({url:location.href,title:document.title,' +
      'bodyLen:document.body?document.body.innerText.length:-1,' +
      'htmlLen:document.documentElement.outerHTML.length});})();'
    ).then(function (info) {
      console.log('[diag] ' + info);
      diagLog('[top] ' + info);
    }).catch(function (err) {
      console.log('[diag] failed: ' + (err && err.message));
    });
    if (DIAG_ON) {
      setTimeout(function () {
        win.webContents.executeJavaScript(
          '(function(){var out={url:location.href,title:document.title,frames:[]};' +
          'var fs=document.querySelectorAll("iframe");' +
          'for(var i=0;i<fs.length;i++){var f=fs[i],o={h:f.getBoundingClientRect().height,src:(f.src||"").slice(0,120),srcdocLen:(f.srcdoc||"").length};' +
          'try{var d=f.contentDocument,w=f.contentWindow;' +
          'o.bodyLen=d&&d.body?d.body.innerText.length:-1;' +
          'o.head=d&&d.body?d.body.innerText.slice(0,120):"";' +
          'o.cards=d?d.querySelectorAll(".card").length:-1;' +
          'o.mods=d?d.querySelectorAll("[data-mod]").length:-1;' +
          'o.tabs=d?d.querySelectorAll("#coreTabs [data-focus]").length:-1;' +
          'o.fab=d?!!d.getElementById("fabAdd"):false;' +
          'o.sdk=w?!!w.__SMART_PAGE__:false;' +
          'o.db=w?!!(w.__SMART_PAGE__&&w.__SMART_PAGE__.database):false;' +
          'o.htmlLen=d?d.documentElement.outerHTML.length:-1;' +
          'o.scriptCount=d?d.querySelectorAll("script").length:-1;' +
          'o.sandbox=f.getAttribute("sandbox");' +
          '}catch(e){o.err=String(e&&e.message);}out.frames.push(o);}' +
          'return JSON.stringify(out);})();'
        ).then(function (s) { diagLog('[frames] ' + s); }).catch(function (e) { diagLog('[frames-err] ' + String(e && e.message)); });
      }, 7000);
    }
    injectShell(win);
    checkAuthState(win.webContents.getURL());
  });

  const onNav = function (e, url) { checkAuthState(url); };
  win.webContents.on('did-navigate', onNav);
  win.webContents.on('did-redirect-navigation', onNav);

  win.webContents.on('did-fail-load', function (e, code, desc, url, isMainFrame) {
    if (!isMainFrame || code === -3) return;
    const msg = (desc || 'NETWORK_ERROR').replace(/'/g, '');
    win.webContents.executeJavaScript(
      '(function(){var old=document.getElementById("tbshell-offline");if(old){old.remove();}' +
      'var d=document.createElement("div");d.id="tbshell-offline";' +
      'var t=document.createElement("div");t.textContent="连接不上待办台，检查一下网络";' +
      'var b=document.createElement("button");b.textContent="重新加载";' +
      'b.addEventListener("click",function(){location.href=' + JSON.stringify(PAGE_URL) + ';});' +
      'd.appendChild(t);d.appendChild(b);document.body.appendChild(d);})();'
    ).catch(function () { /* 忽略 */ });
    console.error('[widget] 页面加载失败:', code, msg);
  });

  const save = function () {
    if (loginMode) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      if (!win || win.isDestroyed()) return;
      const b = win.getBounds();
      persist({ width: b.width, height: b.height, x: b.x, y: b.y, alwaysOnTop: win.isAlwaysOnTop() });
    }, 400);
  };
  win.on('resize', save);
  win.on('move', save);

  win.on('closed', function () {
    win = null;
  });
}

function setupAutostart() {
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: true });
    return;
  }
  try {
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath, args: [APP_DIR] });
  } catch (e) {
    console.error('[widget] 开机自启设置失败:', e && e.message);
  }
}

/* ---------- 生命周期 ---------- */

const MAKE_SHORTCUT = process.argv.indexOf('--make-shortcut') !== -1;

if (MAKE_SHORTCUT) {
  /* 一次性任务：生成桌面快捷方式（用 Electron 自带 API，绕开系统 COM 限制） */
  app.whenReady().then(function () {
    const lnkPath = path.join(app.getPath('desktop'), '我的待办台.lnk');
    let ok = false;
    try {
      ok = shell.writeShortcutLink(lnkPath, {
        target: process.execPath,
        args: '"' + APP_DIR + '"',
        cwd: APP_DIR,
        icon: path.join(__dirname, 'icon.ico'),
        iconIndex: 0,
        description: '我的待办台 · 桌面浮窗'
      });
    } catch (e) {
      console.error('[shortcut] 失败: ' + (e && e.message));
    }
    console.log('[shortcut] ' + (ok ? 'OK ' + lnkPath : 'FAILED'));
    app.quit();
  });
} else if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', function () {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(function () {
    stateFile = path.join(app.getPath('userData'), 'widget-state.json');
    createWindow();

    /* 开机自启由系统计划任务 TodoDeskWidget 负责（更稳，且与会话解耦），
       这里不再写注册表 Run 项，避免开机时被拉起两次。 */
    const st = readState();
    if (!st.autostartInitialized) {
      persist({ autostartInitialized: true, autostart: true });
    }

    ipcMain.on('shell:minimize', function () {
      if (win) win.minimize();
    });
    ipcMain.on('shell:close', function () {
      if (win) win.close();
    });
    ipcMain.on('shell:toggle-pin', function () {
      if (!win) return;
      const next = !win.isAlwaysOnTop();
      win.setAlwaysOnTop(next, 'floating');
      setPinUI(next);
      persist({ alwaysOnTop: next });
    });
    ipcMain.on('shell:open-browser', function () {
      shell.openExternal(PAGE_URL);
    });
  });

  app.on('window-all-closed', function () {
    app.quit();
  });
}
