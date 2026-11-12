# -*- coding: utf-8 -*-
"""生成离线测试页：把真实页面的脚本挂到 mock 数据服务上，验证新增交互。"""
import io
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = io.open(os.path.join(HERE, '..', 'src', 'todo.html'), encoding='utf-8').read()
schema = json.load(io.open(os.path.join(HERE, '..', 'src', 'schema_real.json'), encoding='utf-8'))

rows = [
    {
        '_id': 'r1', '任务': '测试任务A', '状态': '4KrY2kHJiXqC',
        '优先级': 'pqfHpJFmJFsY', '分类': 'AI',
        '计划日期': '', '截止日期': '2026-11-20', '完成日期': '',
        '备注': '', '详情': ''
    },
    {
        '_id': 'r2', '任务': '测试任务B（今天截止）', '状态': '4KrY2kHJiXqC',
        '优先级': 'IgVmOyyJyoen', '分类': '企微',
        '计划日期': '', '截止日期': '2026-11-12', '完成日期': '',
        '备注': '', '详情': ''
    }
]

mock = """
<script>
window.__calls = [];
window.__SMART_PAGE__ = {
  database: {
    getSchema: function () { return Promise.resolve(SCHEMA); },
    query: function () { return Promise.resolve({ results: ROWS.slice(), hasMore: false, nextCursor: null }); },
    addRecord: function (a) { window.__calls.push(['add', a]); return Promise.resolve({}); },
    updateRecord: function (a) { window.__calls.push(['update', a]); return Promise.resolve({}); },
    deleteRecord: function (a) { window.__calls.push(['delete', a]); return Promise.resolve({}); }
  }
};
</script>
"""
mock = mock.replace('SCHEMA', json.dumps({'properties': schema['properties']}, ensure_ascii=False))
mock = mock.replace('ROWS', json.dumps(rows, ensure_ascii=False))

out = src.replace('<script>', mock + '\n<script>', 1)
io.open(os.path.join(HERE, '_test.html'), 'w', encoding='utf-8', newline='').write(out)
print('wrote _test.html', len(out), 'chars')
