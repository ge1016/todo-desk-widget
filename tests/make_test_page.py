# -*- coding: utf-8 -*-
"""生成离线测试页：把真实页面脚本挂到 mock 数据服务上，验证 v4 新增交互。"""
import io
import json
import os
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(HERE, '..', 'src', 'todo.html'), encoding='utf-8').read()
schema = json.load(io.open(os.path.join(HERE, '..', 'src', 'schema_real.json'), encoding='utf-8'))

T = date.today()


def d(days):
    return (T + timedelta(days=days)).isoformat()


S_TODO = '4KrY2kHJiXqC'
S_DOING = 'NcPmHCjxCZob'
S_DONE = 'ZSmFM2nH1NLM'
S_HOLD = 'v8E2iCHvZcUB'
P_HIGH = 'pqfHpJFmJFsY'
P_MID = 'IgVmOyyJyoen'

rows = [
    # r1：进行中、计划与截止都在未来 -> 进行中模块；有一条衍生任务
    {'_id': 'r1', '任务': '测试任务A（进行中）', '状态': S_DOING, '优先级': P_HIGH,
     '分类': 'AI', '计划日期': d(3), '截止日期': d(8), '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
    # r2：今天截止 -> 今日必做模块
    {'_id': 'r2', '任务': '测试任务B（今天截止）', '状态': S_TODO, '优先级': P_MID,
     '分类': '企微', '计划日期': '', '截止日期': d(0), '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
    # r3：逾期 -> 今日必做模块 + 计入已逾期
    {'_id': 'r3', '任务': '测试任务C（已逾期）', '状态': S_TODO, '优先级': P_MID,
     '分类': '企微', '计划日期': '', '截止日期': d(-2), '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
    # r4：今天完成 -> 最近完成模块
    {'_id': 'r4', '任务': '测试任务D（今日完成）', '状态': S_DONE, '优先级': P_MID,
     '分类': 'AI', '计划日期': '', '截止日期': d(-2), '完成日期': d(0),
     '备注': '', '详情': '', '来源': ''},
    # r5：由 r1 衍生、没排期 -> 今日必做模块，带来源徽章
    {'_id': 'r5', '任务': '由A衍生的后续', '状态': S_TODO, '优先级': P_MID,
     '分类': '', '计划日期': '', '截止日期': '', '完成日期': '',
     '备注': '', '详情': '', '来源': 'r1'},
    # r6：搁置
    {'_id': 'r6', '任务': '测试任务F（搁置）', '状态': S_HOLD, '优先级': P_MID,
     '分类': '', '计划日期': '', '截止日期': '', '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
    # r7：计划日期已过、但截止日还很远 -> 不应因「起始日期」进今日必做
    {'_id': 'r7', '任务': '测试任务G（计划已过·截止还远）', '状态': S_TODO, '优先级': P_MID,
     '分类': 'AI', '计划日期': d(-2), '截止日期': d(20), '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
    # r8：没有计划日期、2 天后截止 -> 按截止日倒推进今日必做
    {'_id': 'r8', '任务': '测试任务H（2天后截止）', '状态': S_TODO, '优先级': P_MID,
     '分类': '', '计划日期': '', '截止日期': d(2), '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
    # r11：进行中、开始日已过 -> 已经开始，只显示开始日期且用健康绿，不显示「已过」
    {'_id': 'r11', '任务': '测试任务K（进行中·开始日已过）', '状态': S_DOING, '优先级': P_MID,
     '分类': '', '计划日期': d(-3), '截止日期': d(12), '完成日期': '',
     '备注': '', '详情': '', '来源': ''},
]

# 所有正常任务都没有删除标记
for _r in rows:
    _r.setdefault('删除时间', '')

# r9 / r10：已删除记录，用于验证回收区（正常视图必须完全看不到它们）
rows.append(
    {'_id': 'r9', '任务': '测试任务I（已在回收区·待恢复）', '状态': S_TODO, '优先级': P_MID,
     '分类': 'AI', '计划日期': '', '截止日期': '', '完成日期': '',
     '备注': '', '详情': '', '来源': '', '删除时间': '2026-11-15T02:00:00.000Z'}
)
rows.append(
    {'_id': 'r10', '任务': '测试任务J（回收区·待彻底删除）', '状态': S_TODO, '优先级': P_MID,
     '分类': '企微', '计划日期': '', '截止日期': '', '完成日期': '',
     '备注': '', '详情': '', '来源': '', '删除时间': '2026-11-14T06:30:00.000Z'}
)

mock = """
<script>
window.__calls = [];
try {
  window.localStorage.removeItem('todo_view_v3');
  window.localStorage.removeItem('todo_due_mode_v1');
  window.localStorage.removeItem('todo_due_mode_per_v1');
  window.localStorage.removeItem('todo_focus_lead_v1');
  window.localStorage.removeItem('todo_urgency_motion_v1');
  window.localStorage.removeItem('todo_draft_v1');
} catch (e) {}
var __rows = ROWS;
function __findRow(id) {
  for (var i = 0; i < __rows.length; i++) { if (__rows[i]._id === id) { return i; } }
  return -1;
}
window.__SMART_PAGE__ = {
  database: {
    getSchema: function () { return Promise.resolve(SCHEMA); },
    query: function () { return Promise.resolve({ results: __rows.slice(), hasMore: false, nextCursor: null }); },
    addRecord: function (a) { window.__calls.push(['add', a]); return Promise.resolve({}); },
    updateRecord: function (a) {
      window.__calls.push(['update', a]);
      var p = a.properties || {};
      var i = __findRow(a.recordId);
      /* 同步会改变统计的字段，其余保持原样，避免影响已有断言 */
      if (i >= 0 && p['删除时间']) { __rows[i]['删除时间'] = p['删除时间'].text; }
      if (i >= 0 && p['状态']) { __rows[i]['状态'] = p['状态'].select; }
      if (i >= 0 && p['完成日期']) { __rows[i]['完成日期'] = p['完成日期'].date; }
      return Promise.resolve({});
    },
    deleteRecord: function (a) {
      window.__calls.push(['delete', a]);
      var i = __findRow(a.recordId);
      if (i >= 0) { __rows.splice(i, 1); }
      return Promise.resolve({});
    }
  }
};
</script>
"""
mock = mock.replace('SCHEMA', json.dumps({'properties': schema['properties']}, ensure_ascii=False))
mock = mock.replace('ROWS', json.dumps(rows, ensure_ascii=False))

out = src.replace('<script>', mock + '\n<script>', 1)
io.open(os.path.join(HERE, '_test.html'), 'w', encoding='utf-8', newline='').write(out)
print('wrote _test.html', len(out), 'chars | rows', len(rows), '| today', T.isoformat())
