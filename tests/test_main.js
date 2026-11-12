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
  function badge(id, kind) {
    return document.querySelector('.card[data-id="' + id + '"] [data-date-kind="' + kind + '"]');
  }
  function due(id) { return badge(id, 'due'); }
  function perPrefs() {
    try { return JSON.parse(window.localStorage.getItem('todo_due_mode_per_v1') || '{}'); }
    catch (e) { return {}; }
  }
  try {
    /* 1. 首页结构：核心标签 + 模块 + 悬浮按钮 */
    ck('core_tabs_4', document.querySelectorAll('#coreTabs [data-focus]').length === 4);
    ck('modules_5', document.querySelectorAll('[data-mod]').length === 5);
    ck('fab_exists', !!$('#fabAdd'));
    ck('add_mask_initially_hidden', $('#addMask').hidden);
    ck('initial_cards_8', cards() === 8);
    ck('focus_module_4', inMod('focus') === 4);
    ck('doing_module_1', inMod('doing') === 1);
    ck('todo_module_1', inMod('todo') === 1);
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

    /* 4.5 今日必做：按截止日往前推，临期窗口可切 1/3/7 天 */
    ck('plan_past_due_far_excluded', !$('[data-list="focus"] .card[data-id="r7"]'));
    ck('plan_past_due_far_in_todo_pool', !!$('[data-list="todo"] .card[data-id="r7"]'));
    ck('due_in_2_days_in_focus', !!$('[data-list="focus"] .card[data-id="r8"]'));
    ck('no_dates_still_in_focus', !!$('[data-list="focus"] .card[data-id="r5"]'));
    ck('lead_button_default_3', $('#focusLeadBtn').textContent.indexOf('3 天') >= 0);
    click('#focusLeadBtn');
    ck('lead_click_does_not_fold', !$('[data-list="focus"]').hidden);
    ck('lead_cycle_to_7', $('#focusLeadBtn').textContent.indexOf('7 天') >= 0);
    ck('lead_7_keeps_near_task', !!$('[data-list="focus"] .card[data-id="r8"]'));
    click('#focusLeadBtn');
    ck('lead_cycle_to_1', $('#focusLeadBtn').textContent.indexOf('1 天') >= 0);
    ck('lead_1_excludes_2day_task', !$('[data-list="focus"] .card[data-id="r8"]'));
    ck('lead_1_focus_count_3', inMod('focus') === 3);
    ck('lead_pref_persisted', window.localStorage.getItem('todo_focus_lead_v1') === '1');
    click('#focusLeadBtn');
    ck('lead_cycle_back_to_3', $('#focusLeadBtn').textContent.indexOf('3 天') >= 0);
    ck('lead_3_restores_focus', inMod('focus') === 4);

    /* 5. 日期 / 倒计时：单任务独立切换，同步按钮统一全部 */
    ck('initial_r1_due_shows_mmdd', !!due('r1') && due('r1').textContent.indexOf('截止 ') === 0 && due('r1').textContent.indexOf('-') > 0);
    var t2 = due('r2').textContent, t3 = due('r3').textContent;
    ck('initial_r3_overdue_date', t3.indexOf('已逾期') === 0);
    ck('completed_card_due_not_toggleable', !$('.card[data-id="r4"] .badge.date-tog'));

    due('r1').click();
    ck('single_click_r1_to_count', due('r1').textContent.indexOf('天后') >= 0);
    ck('single_click_r2_unchanged', due('r2').textContent === t2);
    ck('single_click_r3_unchanged', due('r3').textContent === t3);
    ck('same_card_plan_badge_follows', badge('r1', 'plan').textContent.indexOf('天后') >= 0);
    ck('single_click_marks_solo', due('r1').classList.contains('solo'));
    ck('solo_pref_persisted', perPrefs()['r1'] === 'count');
    ck('sync_btn_reports_solo_count', $('#dueModeBtn').title.indexOf('1 条单独设置') >= 0);

    due('r1').click();
    ck('second_click_back_to_date', due('r1').textContent.indexOf('截止 ') === 0);
    ck('second_click_clears_solo', !due('r1').classList.contains('solo'));
    ck('solo_pref_removed', !perPrefs()['r1']);

    click('#dueModeBtn');
    ck('sync_all_r1_count', due('r1').textContent.indexOf('天后') >= 0);
    ck('sync_all_r2_today', due('r2').textContent.indexOf('今天') >= 0);
    ck('sync_all_r3_overdue_days', due('r3').textContent.indexOf('逾期 2 天') >= 0);
    ck('sync_button_label_flipped', $('#dueModeBtn').textContent.indexOf('全部切到日期') >= 0);
    ck('sync_clears_solo_marks', document.querySelectorAll('.badge.date-tog.solo').length === 0);

    due('r1').click();
    ck('after_sync_single_click_date', due('r1').textContent.indexOf('截止 ') === 0);
    ck('after_sync_others_stay_count', due('r2').textContent.indexOf('今天') >= 0);
    click('#dueModeBtn');
    ck('sync_back_to_date', due('r1').textContent.indexOf('截止 ') === 0 && due('r2').textContent.indexOf('截止 ') === 0);
    ck('final_no_solo_marks', document.querySelectorAll('.badge.date-tog.solo').length === 0);

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
