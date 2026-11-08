#!/usr/bin/env python3
"""Synthesizes every sound in the game (ambience, effects, music) into audio/*.ogg.
Everything here is original and generated from scratch: no samples, no licenses.
    python3 tools/make_audio.py
Requires numpy and ffmpeg (libvorbis)."""
import os
import subprocess
import numpy as np

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio')
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ building blocks

def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def band(x, lo=None, hi=None, slope=1.0):
    """FFT band filter (circular, so loops stay seamless). Soft edges via slope (octaves)."""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    g = np.ones_like(f)
    with np.errstate(divide='ignore'):
        if lo:
            g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (4 / slope))
        if hi:
            g *= 1 / (1 + (f / hi) ** (4 / slope))
    return np.fft.irfft(X * g, n)


def pink(sec):
    x = noise(sec)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X = np.fft.rfft(x) / np.sqrt(np.maximum(f, 20))
    return np.fft.irfft(X, len(x))


def smooth_env(n, points, k=0.0):
    """Piecewise-linear envelope through (time, value) points, length n samples."""
    ts = np.array([p[0] for p in points]) * SR
    vs = np.array([p[1] for p in points])
    return np.interp(np.arange(n), ts, vs)


def slow_lfo(n, rate, seed_phase=0.0):
    t = np.arange(n) / SR
    return 0.5 + 0.5 * np.sin(2 * np.pi * rate * t + seed_phase)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def place(buf, clip, at):
    i = int(at * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(clip))
    buf[i:j] += clip[:j - i]


def place_wrap(buf, clip, at):
    """Add a clip into a loop buffer, wrapping past the end (seamless loops)."""
    i = int(at * SR) % len(buf)
    n = len(clip)
    end = i + n
    if end <= len(buf):
        buf[i:end] += clip
    else:
        k = len(buf) - i
        buf[i:] += clip[:k]
        buf[:n - k] += clip[k:]


def stereo(l, r=None):
    if r is None:
        r = l
    return np.stack([l, r], axis=1)


def write(name, data, q=4):
    os.makedirs(OUT, exist_ok=True)
    data = np.clip(data, -1, 1)
    raw = (data * 32767).astype('<i2').tobytes()
    ch = 1 if data.ndim == 1 else data.shape[1]
    path = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', str(ch), '-i', '-',
                    '-c:a', 'libvorbis', '-q:a', str(q), path], input=raw, check=True)
    print(f'{name}.ogg  {len(data) / SR:5.1f}s  {os.path.getsize(path) // 1024} KB')


# ------------------------------------------------------------------ nature voices

def chirp(f0, f1, dur, vib=0.0, harm=0.25):
    t = t_axis(dur)
    f = f0 * (f1 / f0) ** (t / dur)
    f = f * (1 + vib * np.sin(2 * np.pi * 28 * t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return (np.sin(ph) + harm * np.sin(2 * ph)) * env


def cardinal():
    """'cheer-cheer-cheer' downslurred whistles."""
    out = np.zeros(int(1.6 * SR))
    for k in range(int(rng.integers(3, 6))):
        place(out, chirp(4200, 2100, 0.17, 0.0, 0.1) * 0.9, k * 0.22)
    return out


def wren():
    """fast bubbly trill."""
    out = np.zeros(int(1.4 * SR))
    base = rng.uniform(3000, 4200)
    for k in range(int(rng.integers(10, 18))):
        place(out, chirp(base * rng.uniform(1.0, 1.5), base * rng.uniform(0.8, 1.2), 0.05, 0.02) * 0.6, k * 0.07)
    return out


def chickadee():
    """'fee-bee' two-note whistle."""
    out = np.zeros(int(1.0 * SR))
    place(out, chirp(4000, 3950, 0.32, 0.0, 0.05), 0.0)
    place(out, chirp(3400, 3350, 0.38, 0.0, 0.05), 0.42)
    return out


def birds(sec, density=0.35):
    out = np.zeros(int(sec * SR))
    calls = [cardinal, wren, chickadee]
    t = 0.3
    while t < sec:
        c = calls[int(rng.integers(0, 3))]() * rng.uniform(0.25, 0.6)
        place_wrap(out, c, t)
        t += rng.exponential(1 / density) + 0.6
    return band(out, 1800, 9000)


def cicadas(sec):
    """Texas summer: dense pulsing buzz that swells and fades in waves."""
    n = int(sec * SR)
    t = np.arange(n) / SR
    buzz = band(noise(sec), 3800, 7200, 0.6)
    pulse = 0.55 + 0.45 * np.sin(2 * np.pi * 95 * t) ** 2
    # swells: loop-periodic so the file loops seamlessly
    swell = np.zeros(n)
    for k in range(3):
        rate = (k + 1) / sec * rng.integers(1, 3)
        swell += slow_lfo(n, rate, rng.uniform(0, 6.28))
    swell = (swell / 3) ** 2.2
    return buzz * pulse * (0.15 + 0.85 * swell)


def brook(sec):
    """Babbling creek: bubbly resonant blips over a soft rush."""
    n = int(sec * SR)
    rush = band(noise(sec), 300, 2600) * 0.35
    bubbles = np.zeros(n)
    for _ in range(int(sec * 55)):
        f = rng.uniform(380, 1400)
        d = rng.uniform(0.02, 0.07)
        t = t_axis(d)
        b = np.sin(2 * np.pi * np.cumsum(f * (1 + 0.6 * t / d)) / SR) * np.exp(-t / (d * 0.35))
        place_wrap(bubbles, b * rng.uniform(0.15, 0.5), rng.uniform(0, sec))
    gurgle = slow_lfo(n, 3 / sec) * 0.5 + 0.5
    return rush * gurgle + band(bubbles, 250, 3000)


def river(sec):
    """Broad shallow river: low rush with slow surges and a few plops."""
    n = int(sec * SR)
    rush = band(pink(sec), 120, 1800) * (0.7 + 0.3 * slow_lfo(n, 2 / sec))
    plops = np.zeros(n)
    for _ in range(int(sec * 3)):
        f = rng.uniform(500, 900)
        t = t_axis(0.12)
        p = np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * t)) / SR) * np.exp(-t * 40)
        place_wrap(plops, p * rng.uniform(0.2, 0.5), rng.uniform(0, sec))
    return rush + band(plops, 300, 2500) * 0.6


def lapping(sec):
    """Swimming hole: gentle water lapping against the wall."""
    n = int(sec * SR)
    out = np.zeros(n)
    t = 0.0
    while t < sec:
        d = rng.uniform(0.5, 1.1)
        tt = t_axis(d)
        lap = band(noise(d), 200, 1400) * np.sin(np.pi * tt / d) ** 3
        place_wrap(out, lap * rng.uniform(0.3, 0.7), t)
        t += rng.uniform(0.6, 1.6)
    return out + band(noise(sec), 100, 600) * 0.12


def wind(sec):
    n = int(sec * SR)
    w = band(pink(sec), 150, 2500)
    gust = np.zeros(n)
    for k in range(3):
        gust += slow_lfo(n, (k + 1) / sec, rng.uniform(0, 6.28))
    return w * (0.25 + 0.75 * (gust / 3) ** 2)


def leaves(sec):
    """Rustling canopy: crackly high noise in gusts."""
    n = int(sec * SR)
    crackle = band(noise(sec) * (rng.random(n) < 0.08), 2500, 9000)
    gust = slow_lfo(n, 2 / sec) ** 2
    return crackle * (0.2 + 0.8 * gust) + band(pink(sec), 600, 4000) * gust * 0.3


def ambience(name, layers, sec=40.0):
    """Mix layers (fn, gain) into a seamless stereo loop with decorrelated channels."""
    l = np.zeros(int(sec * SR))
    r = np.zeros(int(sec * SR))
    for fn, g in layers:
        a = norm(fn(sec), 1.0) * g
        b = norm(fn(sec), 1.0) * g
        l += a * 0.7 + b * 0.3
        r += b * 0.7 + a * 0.3
    m = max(np.max(np.abs(l)), np.max(np.abs(r)))
    write(name, stereo(l / m * 0.7, r / m * 0.7), q=3)


# ------------------------------------------------------------------ effects

def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / d)


def sfx_splash(big=False):
    d = 1.4 if big else 0.8
    n = int(d * SR)
    body = band(noise(d), 250, 7000) * env_ad(n, 0.005, 0.12 if big else 0.07)
    spray = band(noise(d), 2500, 11000) * env_ad(n, 0.02, 0.25 if big else 0.15) * 0.5
    bub = np.zeros(n)
    for _ in range(40 if big else 18):
        f = rng.uniform(500, 1600)
        t = t_axis(0.05)
        place(bub, np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * t)) / SR) * np.exp(-t * 60) * 0.3, rng.uniform(0.05, d * 0.7))
    return norm(body + spray + bub, 0.85)


def sfx_paddle():
    d = 0.35
    n = int(d * SR)
    return norm(band(noise(d), 300, 3000) * env_ad(n, 0.04, 0.08), 0.6)


def sfx_step_dirt():
    d = 0.12
    n = int(d * SR)
    thump = np.sin(2 * np.pi * 90 * t_axis(d)) * env_ad(n, 0.002, 0.02)
    grit = band(noise(d), 1500, 7000) * env_ad(n, 0.001, 0.025) * (rng.random(n) < 0.4)
    return norm(thump * 0.6 + grit, 0.5)


def sfx_step_water():
    d = 0.25
    n = int(d * SR)
    return norm(band(noise(d), 400, 5000) * env_ad(n, 0.004, 0.05), 0.5)


def sfx_shake():
    """Fur flapping (fast rhythmic thwacks) + spray."""
    d = 1.2
    n = int(d * SR)
    t = t_axis(d)
    flap = band(noise(d), 200, 2500) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 9 * t))) * np.sin(np.pi * t / d)
    spray = band(noise(d), 3000, 11000) * np.sin(np.pi * t / d) ** 2 * 0.6
    return norm(flap + spray, 0.7)


def sfx_pant():
    """One pant cycle (in + out breath), looped in game."""
    d = 0.5
    n = int(d * SR)
    t = t_axis(d)
    breath = band(noise(d), 500, 4500)
    env = np.exp(-((t - 0.1) / 0.06) ** 2) + 0.8 * np.exp(-((t - 0.33) / 0.07) ** 2)
    return norm(breath * env, 0.5)


def sfx_bark(pitch=1.0):
    """'Woof': voiced glottal pulse train through dog-ish formants, with a breathy onset."""
    d = 0.32
    n = int(d * SR)
    t = t_axis(d)
    f0 = (380 + 120 * np.exp(-t * 18)) * pitch * (1 - 0.35 * t / d)
    ph = np.cumsum(f0) / SR
    src = (ph % 1.0) ** 6 - 1 / 7 # bright pulse train
    out = np.zeros(n)
    for fc, bw, g in [(700, 180, 1.0), (1300, 220, 0.6), (2600, 400, 0.25)]:
        out += band(src, fc - bw, fc + bw, 0.5) * g
    env = env_ad(n, 0.012, 0.09)
    breath = band(noise(d), 800, 5000) * env_ad(n, 0.003, 0.03) * 0.3
    return norm(out * env + breath, 0.8)


def sfx_whoosh():
    d = 0.45
    n = int(d * SR)
    t = t_axis(d)
    x = noise(d)
    # rising band sweep
    out = np.zeros(n)
    seg = 8
    for k in range(seg):
        s = slice(k * n // seg, (k + 1) * n // seg)
        out[s] = band(x, 600 + k * 300, 2000 + k * 600)[s]
    return norm(out * np.sin(np.pi * t / d) ** 2, 0.5)


def sfx_thud():
    d = 0.2
    n = int(d * SR)
    t = t_axis(d)
    return norm(np.sin(2 * np.pi * (140 - 200 * t) * t) * env_ad(n, 0.002, 0.03) + band(noise(d), 800, 3000) * env_ad(n, 0.001, 0.01) * 0.3, 0.6)


def bell(f, d=1.2, g=1.0):
    t = t_axis(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * (2 + 3 * m)) for m, a in [(1, 1), (2.01, 0.4), (3.02, 0.2), (4.2, 0.1)])
    return x * g * env_ad(len(t), 0.002, 10)


def sfx_treat():
    out = np.zeros(int(1.2 * SR))
    for k, f in enumerate([1318.5, 1760.0, 2093.0]): # E6 A6 C7
        place(out, bell(f, 0.9, 0.7), k * 0.07)
    return norm(out, 0.6)


def sfx_fanfare():
    out = np.zeros(int(2.2 * SR))
    for k, f in enumerate([783.99, 987.77, 1174.66, 1567.98]): # G5 B5 D6 G6
        place(out, bell(f, 1.4, 0.8), k * 0.11)
    place(out, bell(1567.98, 1.6, 0.5) + bell(1975.5, 1.6, 0.3), 0.5)
    return norm(out, 0.7)


# ------------------------------------------------------------------ music

def pluck(f, d, bright=1.0):
    """Nylon-guitar-ish pluck: additive harmonics, higher ones decaying faster, tiny pick noise."""
    t = t_axis(d)
    x = np.zeros_like(t)
    for h in range(1, 12):
        if f * h > 9000:
            break
        a = (1 / h ** 1.15) * (0.6 if h % 2 == 0 else 1.0) * (bright if h > 3 else 1)
        x += a * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * h)) * np.exp(-t * (1.6 + 1.1 * h))
    pick = band(noise(0.02), 1500, 6000) * np.exp(-t_axis(0.02) * 300) * 0.08
    x[:len(pick)] += pick
    return x * env_ad(len(t), 0.003, 100)


def pad(freqs, d):
    """Warm, slowly breathing chord bed (detuned soft saws, low-passed)."""
    t = t_axis(d)
    x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.004, 0.0, 0.005):
            ph = (f * (1 + det) * t) % 1.0
            x += (2 * ph - 1) * 0.3
    x = band(x, 80, 1400)
    env = np.minimum(t / 0.8, 1) * np.minimum((d - t) / 0.8, 1)
    return x * np.clip(env, 0, 1)


def bass(f, d):
    t = t_axis(d)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return x * np.exp(-t * 2.2) * env_ad(len(t), 0.006, 100)


def shaker(d):
    n = int(d * SR)
    return band(noise(d), 5000, 12000) * env_ad(n, 0.004, 0.035)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def music():
    """'Greenbelt Afternoon' — a lazy summer fingerpicking tune in D major, 84 bpm, 16 bars."""
    bpm = 84
    beat = 60 / bpm
    bars = 16
    sec = bars * 4 * beat
    n = int(sec * SR)
    gtr_l = np.zeros(n)
    gtr_r = np.zeros(n)
    padb = np.zeros(n)
    bas = np.zeros(n)
    perc = np.zeros(n)
    mel = np.zeros(n)
    # chords: D  A/C#  Bm  G | D  A  G  A  (twice), voicings as midi notes
    prog = [
        ('D', [50, 57, 62, 66, 69]), ('A', [49, 57, 61, 64, 69]), ('Bm', [47, 54, 59, 62, 66]), ('G', [43, 55, 59, 62, 67]),
        ('D', [50, 57, 62, 66, 69]), ('A', [45, 57, 61, 64, 69]), ('G', [43, 55, 59, 62, 67]), ('A', [45, 57, 61, 64, 67]),
    ]
    # travis-style pattern: (eighth index, voice index)
    pattern = [(0, 0), (1, 3), (2, 2), (3, 4), (4, 1), (5, 3), (6, 2), (7, 4)]
    # simple singable melody over 8 bars (midi, start beat, length beats), repeated with variation
    melody = [(74, 0, 1.5), (76, 1.5, 0.5), (78, 2, 2), (76, 4, 1.5), (73, 5.5, 0.5), (76, 6, 2),
              (74, 8, 1), (73, 9, 1), (71, 10, 2), (67, 12, 1.5), (69, 13.5, 0.5), (71, 14, 2),
              (74, 16, 1.5), (76, 17.5, 0.5), (78, 18, 1.5), (81, 19.5, 0.5), (78, 20, 2), (76, 22, 1), (73, 23, 1),
              (74, 24, 1), (71, 25, 1), (69, 26, 2), (69, 28, 1), (71, 29, 1), (73, 30, 2)]
    for bar in range(bars):
        name, notes = prog[bar % 8]
        t0 = bar * 4 * beat
        for ei, vi in pattern:
            at = t0 + ei * beat / 2 + rng.uniform(-0.008, 0.008) # human timing
            p = pluck(midi(notes[vi]), 2.2, 0.8 if vi == 0 else 1.0) * (0.55 if vi == 0 else 0.42) * rng.uniform(0.85, 1.05)
            pan = 0.35 + 0.3 * (vi / 4)
            place(gtr_l, p * (1 - pan), at)
            place(gtr_r, p * pan, at)
        place(bas, bass(midi(notes[0] - 12), 4 * beat) * 0.5, t0)
        place(bas, bass(midi(notes[0] - 12 + 7), 2 * beat) * 0.3, t0 + 2 * beat)
        place(padb, pad([midi(m) for m in notes[1:4]], 4 * beat + 0.8) * 0.18, t0)
        if bar >= 2:
            for e in range(8):
                place(perc, shaker(0.12) * (0.16 if e % 2 else 0.09), t0 + e * beat / 2)
    if True:
        for rep in (0, 1):
            for m, b, l in melody:
                if rep == 1 and b >= 24:
                    m = m + (2 if m < 74 else 0)
                at = (rep * 32 + b) * beat
                if at >= sec:
                    continue
                tone = pluck(midi(m), l * beat + 1.2, 1.2) * 0.35
                # gentle vibrato-free "whistle" double an octave up, very soft (summer haze)
                tt = t_axis(l * beat)
                wh = np.sin(2 * np.pi * midi(m + 12) * tt) * np.sin(np.pi * tt / (l * beat)) ** 2 * 0.05 * (rep == 1)
                place(mel, tone, at)
                place(mel, wh, at)
    # tail wraps around for a seamless loop
    l = gtr_l + padb * 0.5 + bas * 0.8 + perc * 0.6 + mel * 0.55
    r = gtr_r + padb * 0.5 + bas * 0.8 + perc * 0.4 + mel * 0.45
    # small room: a couple of soft early reflections
    for dl, g in [(0.023, 0.25), (0.041, 0.18), (0.067, 0.12)]:
        k = int(dl * SR)
        l[k:] += r[:-k] * g
        r[k:] += l[:-k] * g * 0.9
    m = max(np.max(np.abs(l)), np.max(np.abs(r)))
    write('music_greenbelt', stereo(l / m * 0.75, r / m * 0.75), q=4)


# ------------------------------------------------------------------ build all

if __name__ == '__main__':
    ambience('amb_swimhole', [(lapping, 0.9), (birds, 0.35), (cicadas, 0.35), (wind, 0.2)])
    ambience('amb_trail', [(leaves, 0.5), (birds, 0.7), (cicadas, 0.5), (wind, 0.3)])
    ambience('amb_bluff', [(wind, 0.7), (cicadas, 0.6), (birds, 0.3)])
    ambience('amb_creek', [(brook, 0.9), (birds, 0.5), (cicadas, 0.4), (leaves, 0.25)])
    ambience('amb_river', [(river, 0.9), (birds, 0.4), (cicadas, 0.35), (wind, 0.2)])
    write('splash', sfx_splash())
    write('splash_big', sfx_splash(True))
    write('paddle', sfx_paddle())
    for i in range(3):
        write(f'step_dirt{i}', sfx_step_dirt())
        write(f'step_water{i}', sfx_step_water())
    write('shake', sfx_shake())
    write('pant', sfx_pant())
    write('bark', sfx_bark(1.0))
    write('bark_small', sfx_bark(1.45))
    write('bark_big', sfx_bark(0.78))
    write('whoosh', sfx_whoosh())
    write('thud', sfx_thud())
    write('treat', sfx_treat())
    write('fanfare', sfx_fanfare())
    music()
