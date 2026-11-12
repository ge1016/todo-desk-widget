# -*- coding: utf-8 -*-
"""生成桌面浮窗图标：蓝色圆角方块 + 白色对勾（256x256 PNG）"""
import struct
import zlib

W = H = 256
R = 58.0
SS = 3  # 每边超采样数 -> 9x 抗锯齿


def inside_round(x, y):
    if x < 0 or y < 0 or x > W or y > H:
        return False
    cx = min(max(x, R), W - R)
    cy = min(max(y, R), H - R)
    return (x - cx) ** 2 + (y - cy) ** 2 <= R * R


def seg_dist(px, py, x1, y1, x2, y2):
    dx = x2 - x1
    dy = y2 - y1
    den = dx * dx + dy * dy
    t = 0.0 if den == 0 else ((px - x1) * dx + (py - y1) * dy) / den
    t = max(0.0, min(1.0, t))
    cx = x1 + t * dx
    cy = y1 + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


# 对勾折线
P1 = (74.0, 134.0)
P2 = (112.0, 172.0)
P3 = (184.0, 92.0)
STROKE = 10.5


def check_cover(x, y):
    d = min(seg_dist(x, y, P1[0], P1[1], P2[0], P2[1]),
            seg_dist(x, y, P2[0], P2[1], P3[0], P3[1]))
    if d <= STROKE:
        return 1.0
    if d >= STROKE + 1.4:
        return 0.0
    return (STROKE + 1.4 - d) / 1.4


def gather(x, y):
    """返回 (r,g,b,a) 0-255"""
    bg_cov = 0.0
    ck_cov = 0.0
    for i in range(SS):
        for j in range(SS):
            sx = x + (i + 0.5) / SS
            sy = y + (j + 0.5) / SS
            if inside_round(sx, sy):
                bg_cov += 1.0
                ck_cov += check_cover(sx, sy)
    n = float(SS * SS)
    a = bg_cov / n
    if a <= 0:
        return (0, 0, 0, 0)
    ck = ck_cov / n
    if ck > 1.0:
        ck = 1.0
    # 垂直渐变：#4C8BFF -> #2B62F2
    t = y / float(H - 1)
    r0 = int(76 + (43 - 76) * t)
    g0 = int(139 + (98 - 139) * t)
    b0 = int(255 + (242 - 255) * t)
    # 叠加白色对勾
    r = int(r0 + (255 - r0) * (ck / a))
    g = int(g0 + (255 - g0) * (ck / a))
    b = int(b0 + (255 - b0) * (ck / a))
    return (min(255, r), min(255, g), min(255, b), int(round(a * 255)))


def chunk(tag, data):
    return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


raw = bytearray()
for y in range(H):
    raw.append(0)
    for x in range(W):
        raw.extend(gather(x, y))

png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
png += chunk(b'IEND', b'')

with open('icon.png', 'wb') as f:
    f.write(png)
print('icon.png written', len(png), 'bytes')
