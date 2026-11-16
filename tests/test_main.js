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
  function markedCalls() {
    return calls('update').filter(function (c) {
      var p = (c[1] && c[1].properties) || {};
      return p['删除时间'] && p['删除时间'].text;
    });
  }
  try {
    /* 1. 首页结构：核心标签 + 模块 + 右下角悬浮按钮 */
    ck('core_tabs_4', document.querySelectorAll('#coreTabs [data-focus]').length === 4);
    ck('modules_5', document.querySelectorAll('[data-mod]').length === 5);
    ck('fab_exists', !!$('#fabAdd'));
    ck('fab_is_fixed', !!$('#fabAdd') && getComputedStyle($('#fabAdd')).position === 'fixed');
    ck('fab_inset_from_right_edge', !!$('#fabAdd') && parseInt(getComputedStyle($('#fabAdd')).right, 10) >= 24);
    ck('fab_inset_from_bottom_edge', !!$('#fabAdd') && parseInt(getComputedStyle($('#fabAdd')).bottom, 10) >= 36);
    ck('no_top_actionbar', !$('#actionBar') && !$('#addNewBtn'));
    ck('trash_button_exists', !!$('#trashBtn'));
    ck('trash_panel_initially_hidden', $('#trashPanel').hidden);
    ck('trash_count_2', $('#trashCount').textContent === '2');
    ck('deleted_records_hidden_from_board', !$('.card[data-id="r9"]') && !$('.card[data-id="r10"]'));
    ck('add_mask_initially_hidden', $('#addMask').hidden);

    /* 1b. 开始日期文案统一，且已过状态不只靠颜色表达 */
    ck('plan_badge_labeled_start', !!badge('r1', 'plan') && badge('r1', 'plan').textContent.indexOf('开始') === 0);
    ck('plan_overdue_labeled_start', !!badge('r7', 'plan') && badge('r7', 'plan').textContent.indexOf('开始 ') === 0);
    ck('plan_overdue_has_visible_state', !!badge('r7', 'plan') && badge('r7', 'plan').textContent.indexOf('已过') >= 0);
    ck('plan_overdue_has_red_class', !!badge('r7', 'plan') && badge('r7', 'plan').classList.contains('over'));
    ck('plan_overdue_red_style', (function () {
      var a = badge('r7', 'plan'), b = badge('r1', 'plan');
      return !!a && !!b && getComputedStyle(a).color !== getComputedStyle(b).color;
    })());
    /* 1b2. 进行中 + 开始日已过：只显示开始日期，用健康绿，不显示「已过」 */
    ck('doing_past_plan_labeled_start', !!badge('r11', 'plan') && badge('r11', 'plan').textContent.indexOf('开始 ') === 0);
    ck('doing_past_plan_no_overdue_word', !!badge('r11', 'plan') && badge('r11', 'plan').textContent.indexOf('已过') < 0);
    ck('doing_past_plan_has_started_class', !!badge('r11', 'plan') && badge('r11', 'plan').classList.contains('started'));
    ck('doing_past_plan_not_red_class', !!badge('r11', 'plan') && !badge('r11', 'plan').classList.contains('over'));
    ck('doing_past_plan_healthy_color', (function () {
      var a = badge('r11', 'plan'), b = badge('r7', 'plan');
      return !!a && !!b && getComputedStyle(a).color === 'rgb(11, 124, 96)' &&
        getComputedStyle(a).color !== getComputedStyle(b).color;
    })());
    ck('doing_past_plan_in_doing_module', !!$('[data-list="doing"] .card[data-id="r11"]'));
    ck('doing_past_plan_not_in_focus', !$('[data-list="focus"] .card[data-id="r11"]'));
    ck('no_shunyan_wording', document.body.textContent.indexOf('顺延') < 0);

    /* 1c. 完成率已移除，改为紧迫度：进行 2 + 临期 3 = 5 → 高 */
    ck('no_completion_rate', document.body.textContent.indexOf('完成率') < 0 && !$('[data-kpi="rate"]'));
    ck('urgency_tab_exists', !!$('#urgencyTab'));
    ck('urgency_kpi_shows_level', !!$('#urgencyNum') && ['低', '中', '高'].indexOf($('#urgencyNum').textContent) >= 0);
    ck('urgency_initial_high', $('#urgencyTab').getAttribute('data-level') === 'high');
    ck('urgency_detail_counts', !!$('#urgencyDetail') && $('#urgencyDetail').textContent.indexOf('进行 2 · 临期 3') >= 0);
    ck('urgency_svg_present', !!$('#urgencyTab .u-arc') && !!$('#urgencyTab .u-core'));
    ck('urgency_pause_button', !!$('#urgencyPause') && $('#urgencyPause').textContent === '⏸');
    ck('urgency_arc_animates_or_reduced', (function () {
      var arc = $('#urgencyTab .u-arc');
      if (!arc) { return false; }
      var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return reduced || getComputedStyle(arc).animationName.indexOf('u-spin') >= 0;
    })());
    ck('urgency_speed_scales_by_level', (function () {
      var t = $('#urgencyTab');
      function spin(l) { t.setAttribute('data-level', l); return parseFloat(getComputedStyle(t).getPropertyValue('--u-spin')); }
      var lo = spin('low'), mid = spin('medium'), hi = spin('high');
      t.setAttribute('data-level', 'high');
      return lo > mid && mid > hi;
    })());
    ck('urgency_color_differs_by_level', (function () {
      var t = $('#urgencyTab');
      function color(l) { t.setAttribute('data-level', l); return getComputedStyle(t).getPropertyValue('--u-color').trim(); }
      var lo = color('low'), mid = color('medium'), hi = color('high');
      t.setAttribute('data-level', 'high');
      return lo !== mid && mid !== hi && lo !== hi;
    })());
    ck('add_form_label_says_start', !!$('#addForm .date-field span') && $('#addForm .date-field span').textContent === '开始');
    ck('plan_dialog_label_says_start', !!$('#planMask .date-field span') && $('#planMask .date-field span').textContent === '开始日期');
    ck('plan_dialog_title_says_start', !!$('#planMask h3') && $('#planMask h3').textContent === '设置开始日期');
    ck('initial_cards_9', cards() === 9);
    ck('focus_module_4', inMod('focus') === 4);
    ck('doing_module_2', inMod('doing') === 2);
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

    /* 3b. 分类筛选后 tag 必须仍在，且能点回总览 */
    function chipCount() { return document.querySelectorAll('#catChips [data-cat]').length; }
    var chipsBefore = chipCount();
    ck('chips_initially_present', chipsBefore >= 2);
    click('#catChips [data-cat="AI"]');
    ck('chips_survive_category_filter', chipCount() === chipsBefore);
    ck('chip_all_present_while_filtered', !!$('#catChips [data-cat=""]'));
    ck('filtered_chip_highlighted', $('#catChips [data-cat="AI"]').classList.contains('on'));
    ck('category_filter_applied', document.querySelectorAll('.card').length < 9);
    click('#catChips [data-cat=""]');
    ck('chip_all_restores_overview', document.querySelectorAll('.card').length === 9);
    ck('chip_all_highlighted_after_reset', $('#catChips [data-cat=""]').classList.contains('on'));
    /* 搜索与今天视图同样不能让 tag 消失 */
    $('#searchInput').value = '任务A';
    $('#searchInput').dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(120);
    ck('chips_survive_search', chipCount() === chipsBefore);
    $('#searchInput').value = '';
    $('#searchInput').dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(120);
    click('#viewTabs [data-view="today"]');
    ck('chips_survive_today_view', chipCount() === chipsBefore);
    click('#viewTabs [data-view="all"]');

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

    /* 11. 回收区：切换视图、恢复、彻底删除（二次确认） */
    var delCallsBeforePurge = calls('delete').length;
    click('#trashBtn');
    ck('trash_panel_visible', !$('#trashPanel').hidden);
    ck('trash_board_hidden', $('#board').hidden);
    ck('trash_button_active', $('#trashBtn').classList.contains('on'));
    ck('trash_lists_2', document.querySelectorAll('#trashList .card').length === 2);
    ck('trash_card_has_restore', !!$('#trashList .card[data-id="r9"] [data-act="restore"]'));
    ck('trash_card_has_purge', !!$('#trashList .card[data-id="r10"] [data-act="purge"]'));
    ck('trash_card_shows_delete_time', !!$('#trashList .card[data-id="r9"] .badge') && $('#trashList .card[data-id="r9"] .badge').textContent.indexOf('删除于') === 0);
    ck('trash_card_no_normal_actions', !$('#trashList .card[data-id="r9"] [data-act="del"]'));

    var updBefore = calls('update').length;
    click('#trashList .card[data-id="r9"] [data-act="restore"]');
    await sleep(450);
    var updAfter = calls('update');
    ck('restore_issued_update', updAfter.length === updBefore + 1);
    ck('restore_clears_delete_time', updAfter.length && updAfter[updAfter.length - 1][1].properties['删除时间'].text === '');
    ck('trash_count_after_restore', $('#trashCount').textContent === '1');
    click('#trashBtn');
    ck('restored_card_back_in_board', !!$('.card[data-id="r9"]'));
    ck('board_visible_after_exit', !$('#board').hidden);

    click('#trashBtn');
    var purgeBtn = $('#trashList .card[data-id="r10"] [data-act="purge"]');
    ck('purge_button_present', !!purgeBtn);
    purgeBtn.click();
    ck('purge_first_click_no_delete', calls('delete').length === delCallsBeforePurge);
    ck('purge_first_click_confirm_label', purgeBtn.textContent.indexOf('确认') >= 0);
    purgeBtn.click();
    await sleep(450);
    ck('purge_second_click_deletes', calls('delete').length === delCallsBeforePurge + 1);
    ck('trash_empty_after_purge', $('#trashCount').textContent === '0');
    click('#trashBtn');

    /* 12. 8 秒反悔期结束后只打删除标记，不物理删除 */
    var purgeDeletes = calls('delete').length;
    var markedBefore = markedCalls().length;
    var softTarget = $('.card[data-id="r6"] [data-act="del"]');
    ck('soft_delete_target_present', !!softTarget);
    softTarget.click();
    ck('soft_delete_toast_shows_trash', $('#toastText').textContent.indexOf('回收区') >= 0);
    ck('soft_delete_not_written_yet', markedCalls().length === markedBefore);
    await sleep(8300);
    var marked = markedCalls();
    ck('soft_delete_writes_timestamp', marked.length === markedBefore + 1);
    ck('soft_delete_target_is_r6', marked.length === markedBefore + 1 && marked[marked.length - 1][1].recordId === 'r6');
    ck('soft_delete_never_hard_deletes', calls('delete').length === purgeDeletes);
    ck('trash_count_after_soft_delete', $('#trashCount').textContent === '1');

    /* 12. 紧迫度随数据实时切换：完成临期 / 进行中任务后逐级降档 */
    var lvStart = $('#urgencyTab').getAttribute('data-level');
    var c3 = $('.card[data-id="r3"] [data-act="done"]');
    if (c3) { c3.click(); await sleep(450); }
    var lvMid = $('#urgencyTab').getAttribute('data-level');
    var c8 = $('.card[data-id="r8"] [data-act="done"]');
    if (c8) { c8.click(); await sleep(450); }
    var c11 = $('.card[data-id="r11"] [data-act="done"]');
    if (c11) { c11.click(); await sleep(450); }
    var lvLow = $('#urgencyTab').getAttribute('data-level');
    ck('urgency_recalc_start_high', lvStart === 'high');
    ck('urgency_recalc_to_medium', lvMid === 'medium');
    ck('urgency_recalc_to_low', lvLow === 'low');
    ck('urgency_detail_follows_data', $('#urgencyDetail').textContent.indexOf('进行 1 · 临期 0') >= 0);

    /* 13. 暂停按钮：可停 / 可恢复，偏好记本地，不触发筛选 */
    click('#urgencyPause');
    ck('urgency_paused_class', $('#urgencyTab').classList.contains('paused'));
    ck('urgency_pause_label_flipped', $('#urgencyPause').textContent === '▶');
    ck('urgency_motion_pref_saved', window.localStorage.getItem('todo_urgency_motion_v1') === 'paused');
    ck('pause_does_not_reset_filter', !$('#coreTabs [data-focus="today"]').classList.contains('on'));
    click('#urgencyPause');
    ck('urgency_resumed', !$('#urgencyTab').classList.contains('paused'));
    ck('urgency_pause_label_restored', $('#urgencyPause').textContent === '⏸');

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
