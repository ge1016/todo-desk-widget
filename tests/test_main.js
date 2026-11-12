const { app, BrowserWindow } = require('electron');
const path = require('path');

const probe = `(async function () {
  var log = [], fails = 0;
  function ck(name, ok) { log.push(name + '=' + (!!ok ? 'PASS' : 'FAIL')); if (!ok) { fails++; } }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function $(s) { return document.querySelector(s); }
  function click(s) { var n = $(s); if (!n) { return false; } n.click(); return true; }
  function cards() { return document.querySelectorAll('.card').length; }
  function inMod(key) { var b = $('[data-list="' + key + '"]'); return b ? b.querySelectorAll('.card').length : -1; }
  function calls(k) { return window.__calls.filter(function (c) { return c[0] === k; }); }
  function lastDueBadge() {
    var b = document.querySelectorAll('.card[data-id="r1"] .badge.date-tog');
    return b.length ? b[b.length - 1] : null;
  }
  try {
    /* 1. 首页结构：核心标签 + 模块 + 悬浮按钮 */
    ck('core_tabs_4', document.querySelectorAll('#coreTabs [data-focus]').length === 4);
    ck('modules_5', document.querySelectorAll('[data-mod]').length === 5);
    ck('fab_exists', !!$('#fabAdd'));
    ck('add_mask_initially_hidden', $('#addMask').hidden);
    ck('initial_cards_6', cards() === 6);
    ck('focus_module_3', inMod('focus') === 3);
    ck('doing_module_1', inMod('doing') === 1);
    ck('done_module_1', inMod('done') === 1);
    ck('hold_module_1', inMod('hold') === 1);

    /* 2. 衍生关系展示 */
    ck('parent_shows_child_badge', !!$('.card[data-id="r1"] .badge.child'));
    ck('child_shows_source_badge', !!$('.card[data-id="r5"] .badge.src'));

    /* 3. 核心标签可点筛选 */
    click('#coreTabs [data-focus="done"]');
    ck('done_tab_highlighted', $('#coreTabs [data-focus="done"]').classList.contains('on'));
    ck('done_module_visible', !$('[data-mod="done"]').hidden);
    ck('focus_module_hidden', $('[data-mod="focus"]').hidden);
    click('#coreTabs [data-focus="done"]');
    click('#coreTabs [data-focus="overdue"]');
    ck('overdue_filter_focus_1', inMod('focus') === 1);
    click('#coreTabs [data-focus="overdue"]');
    ck('filter_cleared_all_modules', !$('[data-mod="doing"]').hidden);

    /* 4. 模块折叠 */
    ck('done_body_folded_initially', $('[data-list="done"]').hidden);
    click('[data-fold="done"]');
    ck('done_body_unfolded', !$('[data-list="done"]').hidden);
    click('[data-fold="done"]');

    /* 5. 截止日期 / 倒计时切换 */
    var b0 = lastDueBadge();
    ck('date_mode_shows_mmdd', !!b0 && b0.textContent.indexOf('截止 ') === 0 && b0.textContent.indexOf('-') > 0);
    click('#dueModeBtn');
    var b1 = lastDueBadge();
    ck('count_mode_shows_days', !!b1 && b1.textContent.indexOf('天后') >= 0);
    ck('mode_button_label_flipped', $('#dueModeBtn').textContent.indexOf('切到日期') >= 0);
    b1.click();
    var b2 = lastDueBadge();
    ck('badge_click_back_to_date', !!b2 && b2.textContent.indexOf('截止 ') === 0 && b2.textContent.indexOf('-') > 0);

    /* 6. 悬浮按钮 + 普通添加 */
    click('#fabAdd');
    ck('fab_opens_add_sheet', !$('#addMask').hidden);
    ck('plain_add_no_source_tag', $('#sourceTag').hidden);
    $('#taskInput').value = '普通新任务';
    click('#addBtn');
    await sleep(450);
    var adds1 = calls('add');
    ck('plain_add_called_once', adds1.length === 1);
    ck('plain_add_has_no_source', adds1.length === 1 && !adds1[0][1].properties['来源']);
    ck('add_sheet_closed_after_submit', $('#addMask').hidden);

    /* 7. 完成任务 -> Toast -> 衍生新事 */
    var doneBtn = $('.card[data-id="r2"] [data-act="done"]');
    ck('todo_has_complete_button', !!doneBtn);
    doneBtn.click();
    await sleep(500);
    ck('complete_toast_visible', !$('#toast').hidden);
    ck('complete_toast_derive_action', $('#toastBtn').textContent.indexOf('衍生') >= 0);
    click('#toastBtn');
    ck('derive_opens_add_sheet', !$('#addMask').hidden);
    ck('derive_source_tag_visible', !$('#sourceTag').hidden);
    ck('derive_source_name_ok', $('#sourceName').textContent.indexOf('测试任务B') >= 0);
    $('#taskInput').value = '由完成衍生出来的新事';
    click('#addBtn');
    await sleep(500);
    var adds2 = calls('add');
    ck('derive_add_called', adds2.length === 2);
    ck('derive_add_writes_source', adds2.length === 2 &&
      !!adds2[1][1].properties['来源'] && adds2[1][1].properties['来源'].text === 'r2');

    /* 8. 卡片 + 衍生 按钮 / 取消关联 */
    var dv = $('.card[data-id="r1"] [data-act="derive"]');
    ck('card_has_derive_button', !!dv);
    dv.click();
    ck('card_derive_opens_sheet', !$('#addMask').hidden && !$('#sourceTag').hidden);
    ck('card_derive_source_name', $('#sourceName').textContent.indexOf('测试任务A') >= 0);
    click('#sourceClear');
    ck('source_clear_hides_tag', $('#sourceTag').hidden);
    click('#addClose');

    /* 9. 改期回归 */
    click('.card[data-id="r1"] [data-act="plan"]');
    ck('plan_mask_open', !$('#planMask').hidden);
    click('#planQuick [data-plan="tomorrow"]');
    await sleep(400);
    var upds = calls('update');
    ck('plan_update_called', upds.length >= 1);
    ck('plan_date_written', upds.length >= 1 && !!upds[upds.length - 1][1].properties['计划日期']);

    /* 10. 今天/全部视图 + 删除撤销回归 */
    click('#viewTabs [data-view="today"]');
    ck('today_view_on', $('#viewTabs [data-view="today"]').classList.contains('on'));
    var todayCards = cards();
    click('#viewTabs [data-view="all"]');
    ck('all_view_not_fewer', cards() >= todayCards);
    var before = cards();
    var del = $('.card [data-act="del"]');
    ck('delete_button_present', !!del);
    del.click();
    ck('delete_removes_card_locally', cards() === before - 1);
    ck('delete_toast_visible', !$('#toast').hidden);
    ck('delete_not_yet_called', calls('delete').length === 0);
    click('#toastBtn');
    ck('undo_restores_card', cards() === before);
    ck('delete_still_not_called', calls('delete').length === 0);

    return JSON.stringify({ fails: fails, log: log });
  } catch (e) {
    return JSON.stringify({ fails: fails + 1, log: log, error: String((e && e.stack) || e) });
  }
})();`;

app.whenReady().then(function () {
  const win = new BrowserWindow({ show: false, width: 1100, height: 900 });
  let finished = false;
  const timer = setTimeout(function () {
    if (finished) { return; }
    console.log('TEST_ERROR timeout waiting for probe');
    app.exit(2);
  }, 30000);

  win.loadFile(path.join(__dirname, '_test.html'));
  win.webContents.on('did-finish-load', function () {
    setTimeout(function () {
      win.webContents.executeJavaScript(probe).then(function (res) {
        finished = true;
        clearTimeout(timer);
        console.log('TEST_RESULT ' + res);
        let fails = 1;
        try { fails = JSON.parse(res).fails; } catch (e) { /* 解析失败按失败处理 */ }
        app.exit(fails ? 1 : 0);
      }).catch(function (err) {
        finished = true;
        clearTimeout(timer);
        console.log('TEST_ERROR ' + String(err && err.message));
        app.exit(3);
      });
    }, 1600);
  });
});
