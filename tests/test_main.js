const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(function () {
  const win = new BrowserWindow({ show: false, width: 1000, height: 900 });
  win.loadFile(path.join(__dirname, '_test.html'));
  win.webContents.on('did-finish-load', function () {
    setTimeout(function () {
      const probe = `(function () {
  var log = [];
  function cards() { return document.querySelectorAll('.card').length; }
  function calls(k) { return window.__calls.filter(function (c) { return c[0] === k; }).length; }
  try {
    log.push('initial_cards=' + cards());
    var del = document.querySelector('.card [data-act="del"]');
    if (!del) { return JSON.stringify({ error: 'no delete button' }); }
    del.click();
    log.push('after_del_cards=' + cards());
    log.push('toast_visible=' + (!document.getElementById('toast').hidden));
    log.push('delete_not_yet_called=' + (calls('delete') === 0));
    document.getElementById('undoBtn').click();
    log.push('after_undo_cards=' + cards());
    log.push('toast_hidden=' + document.getElementById('toast').hidden);
    log.push('delete_still_not_called=' + (calls('delete') === 0));

    document.querySelector('[data-view="today"]').click();
    log.push('today_tab_on=' + document.querySelector('[data-view="today"]').classList.contains('on'));
    log.push('today_cards=' + cards());
    document.querySelector('[data-view="all"]').click();
    log.push('all_cards=' + cards());

    var pb = document.querySelector('.card [data-act="plan"]');
    if (pb) {
      pb.click();
      log.push('plan_mask_open=' + (!document.getElementById('planMask').hidden));
      document.querySelector('[data-plan="tomorrow"]').click();
      var upd = window.__calls.filter(function (c) { return c[0] === 'update'; });
      log.push('update_calls=' + upd.length);
      log.push('plan_date_written=' + (upd.length ? !!upd[upd.length - 1][1].properties['计划日期'] : false));
    }
    return JSON.stringify({ log: log });
  } catch (e) {
    return JSON.stringify({ error: String(e && e.message), log: log });
  }
})();`;
      win.webContents.executeJavaScript(probe).then(function (res) {
        console.log('TEST_RESULT ' + res);
        app.exit(0);
      }).catch(function (err) {
        console.log('TEST_ERROR ' + String(err && err.message));
        app.exit(1);
      });
    }, 1800);
  });
});
