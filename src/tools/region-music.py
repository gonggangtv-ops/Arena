#!/usr/bin/env python3
"""Arena Royale · music and ambience of the five lands (Claude, 2026-11-20).

Original pieces written and synthesised in code for this game (no samples, no third-party material):
  reg-kingdom  Fallen Kingdom   D dorian, 76 bpm   harp, warm strings, wooden flute, frame drum, cello
  reg-cursed   Cursed Forest    D minor/phrygian   detuned music box, low string drone, dissonant swells, heartbeat, whispers
  reg-frost    Frozen Sanctuary D lydian, 72 bpm   glass bells and celesta, airy pad, distant choir, glass harmonica
  reg-ash      Ashen Wastes     E phrygian dominant, 84 bpm   war drums, low horns, reed lead, low choir
  reg-abyss    The Abyss        C locrian, 50 bpm  sub drone, dark choir cluster, struck metal, singing glass
and the ambience beds (seamless loops, no wind noise since 2026-11-20 at the owner's request):
  amb-kingdom  songbirds, a cuckoo far off, leaves, crickets in the grass       (the Fallen Kingdom by day; it used wind.mp3)
  amb-night    crickets, frogs by the water, an owl, a nightjar's churr         (the Fallen Kingdom at night; it was silent)
  amb-cursed   a low uneasy drone, crows, branches creaking, dripping, frogs in the bog, an owl, whispers
  amb-frost    falling snow hush, ice chimes, ice creaking, a wolf far off
  amb-ash      rumble, bubbling lava, crackle, far eruptions
  amb-abyss    void hum, moans, singing glass, echoing drips, slow bubbles

Every track is rendered with its reverb tail folded back into its start, so the loop has no seam.
usage: python3 src/tools/region-music.py [out_dir] [--only frost,ash] [--sec 30]   (needs numpy, scipy, ffmpeg)
"""
import os, sys, subprocess, tempfile, wave
import numpy as np
import scipy.signal as sg

SR = 44100
OUT = 'app/src/main/assets/music'
ONLY = None
PREVIEW = None
args = sys.argv[1:]
i = 0
while i < len(args):
    a = args[i]
    if a == '--only': ONLY = args[i+1].split(','); i += 2; continue
    if a == '--sec': PREVIEW = float(args[i+1]); i += 2; continue
    OUT = a; i += 1

NOTE = {'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}
def m(s):            # 'D4' -> midi number
    return 12*(int(s[-1])+1) + NOTE[s[:-1]]
def hz(x):           # midi number or note name -> Hz
    if isinstance(x, str): x = m(x)
    return 440.0 * 2 ** ((x - 69) / 12)

# ---------------- tools ----------------
def rng(seed): return np.random.default_rng(seed)
def tt(n): return np.arange(n) / SR
def sos(kind, f, order=2):
    nyq = SR / 2
    if kind == 'band': return sg.butter(order, [max(20, f[0]) / nyq, min(nyq * .98, f[1]) / nyq], 'band', output='sos')
    return sg.butter(order, min(nyq * .98, f) / nyq, kind, output='sos')
def filt(x, kind, f, order=2): return sg.sosfilt(sos(kind, f, order), x)
def smooth_noise(n, rate, seed, lo=0., hi=1.):
    """slow random curve (about `rate` changes per second), 0..1 mapped to lo..hi"""
    r = rng(seed); k = max(4, int(n / SR * rate) + 4)
    pts = r.random(k); x = np.linspace(0, k - 3, n)
    i0 = np.floor(x).astype(int); f = x - i0
    p0, p1, p2, p3 = pts[np.maximum(i0 - 1, 0)], pts[i0], pts[i0 + 1], pts[i0 + 2]
    y = p1 + .5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)))
    return lo + (hi - lo) * np.clip(y, 0, 1)
def env_ar(n, a, r):
    e = np.ones(n); na = max(1, int(a * SR)); nr = max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na) ** 1.5
    if nr < n: e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e
def saw(freq, n, ph=0., vib=None):
    """polyBLEP sawtooth; freq may be an array"""
    f = np.full(n, freq, dtype=float) if np.isscalar(freq) else freq
    if vib is not None: f = f * vib
    dt = f / SR; p = (ph + np.cumsum(dt)) % 1.0; y = 2 * p - 1
    a = p < dt; x = p[a] / dt[a]; y[a] -= x + x - x * x - 1
    b = p > 1 - dt; x = (p[b] - 1) / dt[b]; y[b] -= x * x + x + x + 1
    return y
def sine(freq, n, ph=0.):
    if np.isscalar(freq): return np.sin(2 * np.pi * freq * tt(n) + ph)
    return np.sin(2 * np.pi * np.cumsum(freq) / SR + ph)
def vibrato(n, rate=5., depth=.004, delay=.3, seed=0):
    t = tt(n); d = depth * np.clip((t - delay) / .6, 0, 1)
    wob = smooth_noise(n, .7, seed, -.3, .3)
    return 1 + d * np.sin(2 * np.pi * rate * t + wob * 3)

# ---------------- instruments ----------------
def pluck(freq, dur, t60=2.5, bright=.55, seed=0, body=True):
    """Karplus-Strong string (harp, lute, music box when short)"""
    n = int(dur * SR); Nt = SR / freq - .5; N = int(np.floor(Nt)); fr = Nt - N
    r = rng(seed); exc = np.zeros(n); burst = r.standard_normal(N + 2)
    burst = sg.lfilter([bright], [1, -(1 - bright)], burst); burst -= burst.mean(); exc[:N + 2] = burst
    g = 10 ** (-3 / (t60 * freq))
    a = np.zeros(N + 3); a[0] = 1; a[N] -= g * .5 * (1 - fr); a[N + 1] -= g * .5; a[N + 2] -= g * .5 * fr
    y = sg.lfilter([1.], a, exc)
    if body: y = y + .35 * filt(y, 'band', (180, 700))
    y *= env_ar(n, .001, .08)
    return y / (np.abs(y).max() + 1e-9)
def bell(freq, dur, parts=((1, 1, 1.8), (2.76, .45, .9), (5.4, .25, .5), (8.93, .12, .3)), attack=.002, seed=0):
    """additive struck bell / celesta / music box: (ratio, amp, decay seconds)"""
    n = int(dur * SR); t = tt(n); r = rng(seed); y = np.zeros(n)
    for ratio, amp, dec in parts:
        y += amp * np.sin(2 * np.pi * freq * ratio * t + r.random() * 6.283) * np.exp(-t / dec)
    return y * np.minimum(1, t / attack) * env_ar(n, .0005, .05)
def glass(freq, dur, attack=.5, release=1.2, trem=4.2, seed=0):
    """glass harmonica: pure tone, soft swell, slow tremolo, a touch of octave"""
    n = int(dur * SR); t = tt(n); v = vibrato(n, 4.8, .0025, .4, seed)
    y = sine(freq * v, n) + .18 * sine(2 * freq * v, n) + .05 * sine(3 * freq * v, n)
    return y * (1 - .18 * (.5 + .5 * np.sin(2 * np.pi * trem * t))) * env_ar(n, attack, release)
def pad(freqs, dur, attack=2., release=3., cutoff=1600, voices=4, det=7, seed=0, wav='saw'):
    """ensemble pad: detuned saws per note, low-passed, slowly breathing; returns (L, R)"""
    n = int(dur * SR); r = rng(seed); L = np.zeros(n); R = np.zeros(n)
    for fi, f in enumerate(freqs):
        for v in range(voices):
            cents = (v - (voices - 1) / 2) * det / max(1, (voices - 1) / 2) + r.normal(0, 1.5)
            drift = 1 + .0015 * (smooth_noise(n, .25, seed * 31 + fi * 7 + v) - .5)
            x = saw(f * 2 ** (cents / 1200) * drift, n, r.random()) if wav == 'saw' else sine(f * 2 ** (cents / 1200) * drift, n, r.random() * 6)
            p = (v / max(1, voices - 1) - .5) * 1.4
            L += x * np.sqrt(.5 - p * .35); R += x * np.sqrt(.5 + p * .35)
    breath = smooth_noise(n, .2, seed + 99, .75, 1.)
    e = env_ar(n, attack, release) * breath / (len(freqs) * voices) ** .5
    L = filt(L, 'low', cutoff, 2) * e; R = filt(R, 'low', cutoff, 2) * e
    return L, R
FORM = {'oo': ((300, 70, 1.), (870, 90, .32), (2240, 130, .1)), 'ah': ((730, 90, 1.), (1090, 100, .55), (2440, 140, .22)),
        'oh': ((570, 80, 1.), (840, 90, .5), (2410, 140, .15)), 'mm': ((260, 60, 1.), (1100, 200, .08), (2500, 300, .03))}
def voice(freq, dur, vowel='oo', attack=1.2, release=1.8, seed=0, breath=.04):
    """one choir voice: vibrato sawtooth through vowel formants"""
    n = int(dur * SR); src = saw(freq, n, rng(seed).random(), vibrato(n, 5.1 + rng(seed).random() * .6, .005, .35, seed))
    y = np.zeros(n)
    for F, B, gain in FORM[vowel]: y += gain * filt(src, 'band', (F - B, F + B))
    y += breath * filt(rng(seed + 5).standard_normal(n), 'band', (FORM[vowel][1][0] * .8, FORM[vowel][1][0] * 1.6))
    return y * env_ar(n, attack, release)
def choir(freqs, dur, vowel='oo', voices=3, attack=1.5, release=2.2, seed=0, spread=.8):
    n = int(dur * SR); L = np.zeros(n); R = np.zeros(n); k = 0
    for f in freqs:
        for v in range(voices):
            x = voice(f * 2 ** (rng(seed + k).normal(0, 6) / 1200), dur, vowel, attack, release, seed + k)
            p = (rng(seed + k + 300).random() - .5) * spread; L += x * (.7 - p * .5); R += x * (.7 + p * .5); k += 1
    s = 1 / (len(freqs) * voices) ** .5
    return L * s, R * s
def bowed(freq, dur, attack=.6, release=.9, seed=0, cutoff=2600, trem=0.):
    """string section note (or a cello when low)"""
    n = int(dur * SR); x = saw(freq, n, rng(seed).random(), vibrato(n, 5.4, .0045, .25, seed))
    x = filt(x, 'low', cutoff, 2) + .4 * filt(x, 'band', (300, 600)) + .25 * filt(x, 'band', (900, 1500))
    x += .015 * filt(rng(seed + 3).standard_normal(n), 'band', (2000, 6000))   # bow hair
    e = env_ar(n, attack, release)
    if trem: e *= .6 + .4 * np.abs(np.sin(np.pi * trem * tt(n)))
    return x * e
def flute(freq, dur, attack=.08, release=.25, seed=0):
    n = int(dur * SR); v = vibrato(n, 5.2, .0055, .35, seed)
    y = sine(freq * v, n) + .22 * sine(2 * freq * v, n) + .06 * sine(3 * freq * v, n)
    ch = filt(rng(seed).standard_normal(n), 'band', (freq * 1.5, freq * 4)) * .07 * (1 + 2 * np.exp(-tt(n) / .05))
    return (y + ch) * env_ar(n, attack, release)
def reed(freq, dur, attack=.06, release=.3, seed=0):
    """duduk-like double reed: nasal, breathy, wide vibrato"""
    n = int(dur * SR); v = vibrato(n, 5.6, .009, .2, seed); x = saw(freq * v, n, rng(seed).random())
    x = filt(x, 'low', 1700, 2) * .7 + filt(x, 'band', (520, 760)) * .8 + filt(x, 'band', (1150, 1500)) * .35
    x += .05 * filt(rng(seed + 1).standard_normal(n), 'band', (900, 3000))
    return x * env_ar(n, attack, release)
def drum(f0=95, f1=48, tau=.11, dur=1.6, decay=.5, skin=.35, seed=0, skinlp=900):
    n = int(dur * SR); t = tt(n); f = f1 + (f0 - f1) * np.exp(-t / tau)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    hit = filt(rng(seed).standard_normal(n), 'low', skinlp) * np.exp(-t / .025)
    y = body + skin * hit
    return y * env_ar(n, .0007, .05)
def metal(freq, dur, seed=0, decay=4.):
    parts = ((1, 1, decay), (1.414, .6, decay * .8), (2.13, .45, decay * .6), (2.97, .3, decay * .45), (3.84, .2, decay * .35), (5.21, .12, decay * .25), (1.006, .5, decay))
    return bell(freq, dur, parts, .004, seed)

# ---------------- mixing ----------------
def make_ir(dur, seed, damp=1., predelay=.025, width=1.):
    n = int(dur * SR); t = tt(n); r = rng(seed)
    out = []
    for ch in range(2):
        x = r.standard_normal(n); lo = filt(x, 'low', 3000); hi = x - lo
        env = np.exp(-t * 6.9 / dur)
        y = lo * env + hi * env ** (1 + 1.6 * damp)
        y = filt(y, 'high', 120)
        er = np.zeros(n)
        for k in range(10):
            d = int((.008 + r.random() * .07) * SR); er[d] += (r.random() - .5) * .9 * np.exp(-k * .25)
        y += er
        pd = int(predelay * SR); y = np.concatenate([np.zeros(pd), y])[:n]
        out.append(y)
    L, R = out; M = (L + R) / 2; S = (L - R) / 2 * width; L, R = M + S, M - S
    g = 1 / np.sqrt((L ** 2).sum() + 1e-9)
    return L * g, R * g

class Track:
    def __init__(self, dur, tail=7., seed=1):
        self.dur = dur; self.n = int((dur + tail) * SR); self.L = np.zeros(self.n); self.R = np.zeros(self.n)
        self.bus = {}; self.seed = seed
    def put(self, x, t0, pan=0., gain=1., send=None, amt=0.):
        """mono or (L, R) at t0 seconds; equal-power pan"""
        i0 = int(round(t0 * SR))
        if i0 >= self.n: return
        if isinstance(x, tuple): l, r = x
        else:
            p = (pan + 1) * np.pi / 4; l, r = x * np.cos(p), x * np.sin(p)
        if i0 < 0: l, r, i0 = l[-i0:], r[-i0:], 0
        k = min(len(l), self.n - i0)
        if k <= 0: return
        self.L[i0:i0 + k] += l[:k] * gain; self.R[i0:i0 + k] += r[:k] * gain
        if send and amt > 0:
            b = self.bus.setdefault(send, [np.zeros(self.n), np.zeros(self.n)])
            b[0][i0:i0 + k] += l[:k] * gain * amt; b[1][i0:i0 + k] += r[:k] * gain * amt
    def delay(self, name, time, fb=.35, mix=1., pp=True):
        """ping-pong echo applied to a bus in place"""
        b = self.bus.get(name)
        if not b: return
        d = int(time * SR); L, R = b; oL = np.zeros(self.n); oR = np.zeros(self.n); inL, inR = L.copy(), R.copy(); g = mix
        for k in range(1, 7):
            s = d * k
            if s >= self.n: break
            src = inR if (pp and k % 2) else inL; src2 = inL if (pp and k % 2) else inR
            oL[s:] += src[:-s] * g; oR[s:] += src2[:-s] * g; g *= fb
        b[0] += filt(oL, 'low', 4500); b[1] += filt(oR, 'low', 4500)
    def render(self, irs, target_db=-18., hp=35., warm=None, air=0.):
        L, R = self.L.copy(), self.R.copy()
        for name, (ir, wet) in irs.items():
            b = self.bus.get(name)
            if not b: continue
            L += sg.fftconvolve(b[0], ir[0])[:self.n] * wet; R += sg.fftconvolve(b[1], ir[1])[:self.n] * wet
        L = filt(L, 'high', hp); R = filt(R, 'high', hp)
        if warm: L = filt(L, 'low', warm); R = filt(R, 'low', warm)
        if air:   # a gentle high shelf: presence and air above ~3.5 kHz
            g = 10 ** (air / 20) - 1; L = L + g * filt(L, 'high', 3500); R = R + g * filt(R, 'high', 3500)
        # fold the tail into the start: the loop has no seam
        nd = int(self.dur * SR); tail = self.n - nd
        L[:tail] += L[nd:]; R[:tail] += R[nd:]; L, R = L[:nd], R[:nd]
        rms = np.sqrt(((L ** 2 + R ** 2) / 2).mean()) + 1e-9; g = 10 ** (target_db / 20) / rms
        L *= g; R *= g
        L = np.tanh(L * 1.1) / 1.1; R = np.tanh(R * 1.1) / 1.1
        pk = max(np.abs(L).max(), np.abs(R).max())
        if pk > .97: L *= .97 / pk; R *= .97 / pk
        return L, R

def write(name, L, R, kbps=64):
    os.makedirs(OUT, exist_ok=True)
    pcm = (np.stack([L, R], 1) * 32767).astype(np.int16)
    with tempfile.TemporaryDirectory() as td:
        wp = os.path.join(td, name + '.wav')
        with wave.open(wp, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        out = os.path.join(OUT, name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wp, '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', '-ac', '2', out], check=True)
    rms = 20 * np.log10(np.sqrt(((L ** 2 + R ** 2) / 2).mean()) + 1e-9)
    print(f'{name}: {len(L) / SR:.1f}s rms {rms:.1f} dBFS peak {20 * np.log10(max(np.abs(L).max(), np.abs(R).max())):.1f} -> {out} {os.path.getsize(out) // 1024} KB', flush=True)

def circ(x, D, X=4.):
    """equal-power fades so a layer that runs X seconds past the loop point folds back over its own start without a dip"""
    n = len(x); a = int(X * SR); d = int(D * SR); e = np.ones(n)
    e[:a] = np.sin(np.linspace(0, np.pi / 2, a))
    m = max(0, min(a, n - d)); e[d:d + m] = np.cos(np.linspace(0, np.pi / 2, a))[:m]; e[d + m:] = 0
    return x * e
def chord_notes(names): return [hz(x) for x in names]
def length(sec): return PREVIEW if PREVIEW else sec

# ---------------- the five lands ----------------
def kingdom():
    """Fallen Kingdom: D dorian, 76 bpm, melancholic and warm — harp, strings, wooden flute, frame drum, cello"""
    bpm = 76; beat = 60 / bpm; bar = beat * 4; D = length(bar * 30); T = Track(D, 7, 11)
    prog = [['D3', 'F3', 'A3', 'D4'], ['C3', 'E3', 'G3', 'C4'], ['G2', 'B2', 'D3', 'G3'], ['D3', 'F3', 'A3', 'C4'],
            ['F3', 'A3', 'C4', 'F4'], ['C3', 'E3', 'G3', 'E4'], ['G2', 'B2', 'D3', 'B3'], ['A2', 'C3', 'E3', 'A3']]
    bass = ['D2', 'C2', 'G1', 'D2', 'F2', 'C2', 'G1', 'A1']
    r = rng(5)
    for b in range(30):
        t0 = b * bar; ch = prog[b % 8]
        if t0 >= D: break
        # harp: rolling arpeggio, up and back down
        pat = [0, 1, 2, 3, 2, 1, 2, 3] if b % 2 == 0 else [0, 2, 1, 3, 2, 3, 1, 2]
        for k, idx in enumerate(pat):
            f = hz(ch[idx]) * (2 if idx == 3 and b % 4 == 3 else 1)
            T.put(pluck(f * 2, 3.2, 2.8, .5, seed=b * 17 + k), t0 + k * beat / 2 + r.normal(0, .006), pan=-.35 + .1 * k, gain=.34, send='hall', amt=.42)
        # warm string pad under it
        T.put(pad(chord_notes(ch[:3]), bar + 1.4, 1.1, 1.3, 1500, 3, 9, seed=b), t0, gain=.42 if 2 <= b < 28 else .34, send='hall', amt=.55)
        # a soft bass under the roots once the strings are in
        if 2 <= b < 28:
            bn = int((bar * .98) * SR); bf = hz(bass[b % 8])
            T.put((sine(bf, bn) + .25 * sine(2 * bf, bn)) * env_ar(bn, .25, 1.), t0, gain=.3, send='room', amt=.15)
        # cello line from bar 12
        if 12 <= b < 28:
            T.put(bowed(hz(bass[b % 8]) * 2, bar * .98, .35, .5, seed=b + 300, cutoff=1800), t0, pan=.15, gain=.5, send='hall', amt=.35)
        # soft frame drum from bar 16
        if 16 <= b < 28:
            for k, (pos, g) in enumerate(((0, 1.), (1.5, .45), (2, .7), (3.5, .4))):
                T.put(drum(140, 85, .05, 1., .22, .5, seed=b * 9 + k, skinlp=1500), t0 + pos * beat, pan=.1, gain=.32 * g, send='room', amt=.3)
    # wooden flute melody (bars 8-27), dorian with the bright B natural
    mel = [('A4', 2), ('D5', 1), ('E5', 1), ('F5', 2), ('E5', 1), ('D5', 1), ('E5', 3), ('C5', 1), ('G4', 2), ('A4', 2),
           ('D5', 2), ('E5', 1), ('F5', 1), ('G5', 2), ('A5', 2), ('B5', 2), ('A5', 1), ('G5', 1), ('A5', 4),
           ('F5', 2), ('G5', 1), ('A5', 1), ('C6', 2), ('B5', 1), ('A5', 1), ('G5', 3), ('E5', 1), ('C5', 2), ('E5', 2),
           ('D5', 2), ('E5', 1), ('F5', 1), ('E5', 2), ('C5', 2), ('D5', 4), ('A4', 4)]
    t = 8 * bar
    for nm, beats in mel:
        if t > D - 2: break
        d = beats * beat
        T.put(flute(hz(nm), d * .97, .07, .22, seed=int(t * 10)), t, pan=-.1, gain=.36, send='hall', amt=.5)
        t += d
    ir = make_ir(3.6, 1, .9); ir2 = make_ir(1.3, 2, 1.2)
    write('reg-kingdom', *T.render({'hall': (ir, 1.), 'room': (ir2, 1.)}, -15.5, warm=12000, air=5))

def cursed():
    """Cursed Forest: D minor with the phrygian E flat — a drone, a broken music box, swells that rub, a heartbeat, whispers"""
    D = length(96.); T = Track(D, 7, 21); r = rng(21)
    # low drone: D and A, cello-like with slow tremolo, the E flat creeping in now and then
    for k, (t0, d, notes) in enumerate(((0, 50, ['D2', 'A2']), (46, 54, ['D2', 'A2']))):
        for j, nm in enumerate(notes):
            T.put(bowed(hz(nm), d, 4, 5, seed=k * 3 + j, cutoff=900, trem=.35), t0, pan=(j - .5) * .5, gain=.45, send='hall', amt=.5)
    for t0 in (18, 52, 78):
        T.put(bowed(hz('Eb2'), 9, 4, 4, seed=int(t0), cutoff=700), t0, pan=.4, gain=.22, send='hall', amt=.6)
    # dissonant string clusters that swell and resolve
    for t0, cl, res in ((24, ['D4', 'Eb4', 'A4'], ['D4', 'F4', 'A4']), (56, ['C#4', 'D4', 'G#4'], ['D4', 'F4', 'A4']), (82, ['Eb4', 'E4', 'Bb4'], ['D4', 'F4', 'A4'])):
        for j, nm in enumerate(cl): T.put(bowed(hz(nm), 6, 3.5, 1.2, seed=int(t0) + j, cutoff=2000), t0, pan=(j - 1) * .5, gain=.2, send='hall', amt=.7)
        for j, nm in enumerate(res): T.put(bowed(hz(nm), 5, .8, 3, seed=int(t0) + 10 + j, cutoff=1600), t0 + 5.6, pan=(j - 1) * .5, gain=.16, send='hall', amt=.75)
    # the music box: out of tune, slowing, with chromatic slips
    box = [('D5', 1), ('F5', 1), ('A5', 1), ('G#5', 1.5), ('A5', .5), ('F5', 1), ('E5', 1), ('D5', 2),
           ('Bb4', 1), ('D5', 1), ('F5', 1), ('E5', 1.5), ('D#5', .5), ('E5', 1), ('C#5', 1), ('D5', 3),
           ('A5', 1), ('Bb5', 1), ('A5', 1), ('F5', 1), ('E5', 1), ('Eb5', 1), ('D5', 2), ('C#5', 1), ('D5', 3)]
    mb = ((1, 1, 1.3), (3.0, .25, .5), (4.2, .3, .35), (7.1, .08, .2))
    for start, slow in ((30, 1.), (62, 1.12)):
        t = start
        for nm, beats in box:
            d = beats * .62 * slow
            f = hz(nm) * 2 ** (r.normal(0, 14) / 1200)
            T.put(bell(f, 2.2, mb, .001, seed=int(t * 100)), t, pan=r.uniform(-.3, .3), gain=.24, send='hall', amt=.65)
            t += d; slow *= 1.006
    # heartbeat under the last third
    for k in range(18):
        t0 = 64 + k * 1.05
        if t0 > D - 3: break
        for j, off in enumerate((0, .27)):
            T.put(drum(62, 40, .05, .9, .2, .15, seed=k * 2 + j, skinlp=300), t0 + off, gain=(.5 if j == 0 else .32) * min(1, k / 4), send='room', amt=.25)
    # whispers: breathy noise shaped into syllables, here and there, far away
    for k in range(14):
        t0 = r.uniform(4, D - 6); syl = int(r.integers(3, 8)); x = np.zeros(int(2.4 * SR)); tt0 = 0.
        for s in range(syl):
            ln = r.uniform(.07, .2); ns = int(ln * SR); v = r.choice(['oo', 'ah', 'oh'])
            seg = np.zeros(ns); src = r.standard_normal(ns)
            for F, B, g in FORM[v]: seg += g * filt(src, 'band', (F * 1.1 - B, F * 1.1 + B * 2))
            seg += .6 * filt(src, 'band', (3000, 7000))
            seg *= np.sin(np.linspace(0, np.pi, ns)) ** 1.5
            i0 = int(tt0 * SR)
            if i0 + ns < len(x): x[i0:i0 + ns] += seg
            tt0 += ln + r.uniform(.02, .12)
        T.put(x / (np.abs(x).max() + 1e-9), t0, pan=r.uniform(-.9, .9), gain=.07, send='hall', amt=1.2)
    # a reversed swell into each section
    for t0 in (27, 59, 79):
        sw = filt(r.standard_normal(int(3 * SR)), 'band', (400, 3000)) * np.linspace(0, 1, int(3 * SR)) ** 3
        T.put(sw / (np.abs(sw).max() + 1e-9), t0, gain=.09, send='hall', amt=.8)
    ir = make_ir(5.5, 3, 1.1, .04); ir2 = make_ir(1.2, 4, 1.4)
    write('reg-cursed', *T.render({'hall': (ir, 1.1), 'room': (ir2, 1.)}, -17, warm=9000, air=3))

def frost():
    """Frozen Sanctuary: D lydian, 72 bpm — glass bells over an airy pad, a far choir, a glass harmonica tune"""
    bpm = 72; beat = 60 / bpm; bar = beat * 4; D = length(bar * 29); T = Track(D, 8, 31); r = rng(31)
    prog = [['D3', 'A3', 'C#4', 'E4', 'F#4'], ['E3', 'G#3', 'B3', 'D4', 'F#4'], ['B2', 'F#3', 'A3', 'D4', 'E4'], ['A2', 'E3', 'A3', 'C#4', 'B4']]
    bass = ['D2', 'E2', 'B1', 'A1']
    cel = ((1, 1, 2.2), (4.0, .22, .6), (8.0, .06, .25))
    for b in range(0, 29, 2):
        t0 = b * bar; ch = prog[(b // 2) % 4]
        if t0 >= D: break
        T.put(pad(chord_notes(ch[:4]), bar * 2 + 2.5, 2.4, 2.6, 2100, 4, 11, seed=b, wav='saw'), t0, gain=.4, send='hall', amt=.75)
        if 4 <= b < 26: T.put(sine(hz(bass[(b // 2) % 4]), int((bar * 2 + 1) * SR)) * env_ar(int((bar * 2 + 1) * SR), 1.5, 1.5) * .9, t0, gain=.35, send='hall', amt=.2)
        # celesta and glass bells: chord tones up high, unevenly, like ice ticking
        tones = [hz(x) * 4 for x in ch[1:]] + [hz(ch[0]) * 8]
        for k in range(16):
            if r.random() < (.55 if 6 <= b < 24 else .35):
                f = tones[int(r.integers(len(tones)))] * (2 if r.random() < .15 else 1)
                T.put(bell(f, 3.5, cel, .001, seed=b * 40 + k), t0 + k * beat / 2 + r.normal(0, .01), pan=r.uniform(-.7, .7), gain=.16, send='echo', amt=1.)
    T.delay('echo', beat * .75, .42)
    T.bus.setdefault('hall', [np.zeros(T.n), np.zeros(T.n)])
    T.bus['hall'][0] += T.bus['echo'][0] * .8; T.bus['hall'][1] += T.bus['echo'][1] * .8
    # distant choir "oo" from bar 6
    for b in range(6, 26, 4):
        ch = prog[(b // 2) % 4]
        T.put(choir([hz(ch[1]), hz(ch[3])], bar * 4 + 2, 'oo', 3, 2.5, 3, seed=b * 7), b * bar, gain=.32, send='hall', amt=1.)
    # glass harmonica tune (bars 12-25)
    mel = [('A5', 2), ('G#5', 1), ('F#5', 1), ('E5', 3), ('F#5', 1), ('A5', 2), ('B5', 2), ('C#6', 4),
           ('B5', 2), ('A5', 1), ('G#5', 1), ('F#5', 2), ('E5', 2), ('D5', 3), ('E5', 1), ('F#5', 4),
           ('C#6', 2), ('B5', 1), ('A5', 1), ('G#5', 2), ('B5', 2), ('A5', 6), ('D5', 2)]
    t = 12 * bar
    for nm, beats in mel:
        if t > D - 3: break
        d = beats * beat
        T.put(glass(hz(nm), d + .6, .25, .8, seed=int(t * 10)), t, pan=.15, gain=.26, send='hall', amt=.8)
        t += d
    ir = make_ir(6.5, 5, .7, .03, 1.2)
    write('reg-frost', *T.render({'hall': (ir, 1.25)}, -16.5, warm=14000, air=4))

def ash():
    """Ashen Wastes: E phrygian dominant, 84 bpm — war drums, low horns, a reed lament, a low choir"""
    bpm = 84; beat = 60 / bpm; bar = beat * 4; D = length(bar * 32); T = Track(D, 6, 41); r = rng(41)
    roots = [['E2', 'B2'], ['F2', 'C3'], ['E2', 'B2'], ['D2', 'A2']]
    for b in range(0, 32, 2):
        t0 = b * bar
        if t0 >= D: break
        ch = roots[(b // 2) % 4]
        for j, nm in enumerate(ch):
            l, rr = pad([hz(nm)], bar * 2 + 1.5, 1.6, 1.8, 700 + 200 * (b >= 8), 3, 6, seed=b * 3 + j)
            T.put((l * 1.2, rr * 1.2), t0, gain=.42, send='hall', amt=.35)
        T.put(sine(hz(ch[0]) / 2, int((bar * 2 + 1) * SR)) * env_ar(int((bar * 2 + 1) * SR), .8, 1.2), t0, gain=.4)
    # war drums: a great drum on the downbeats, mid drums and rim clicks around it
    pat = [(0, 'big', 1.), (1.5, 'mid', .6), (2, 'big', .8), (3, 'mid', .7), (3.5, 'mid', .5)]
    fill = [(0, 'big', 1.), (.5, 'mid', .6), (1, 'mid', .7), (1.5, 'mid', .8), (2, 'big', .9), (2.5, 'mid', .7), (3, 'mid', .8), (3.25, 'mid', .6), (3.5, 'mid', .9), (3.75, 'mid', 1.)]
    for b in range(2, 30):
        t0 = b * bar
        if t0 >= D: break
        lvl = .45 if b < 8 else .8 if b < 24 else .65
        for k, (pos, kind, g) in enumerate(fill if b % 8 == 7 else pat):
            x = drum(92, 46, .12, 1.8, .55, .4, seed=b * 20 + k) if kind == 'big' else drum(150, 95, .05, .8, .18, .6, seed=b * 20 + k, skinlp=1800)
            T.put(x, t0 + pos * beat + r.normal(0, .004), pan=(-.2 if kind == 'big' else .25), gain=lvl * g * (.8 if kind == 'big' else .42), send='room', amt=.4)
    # reed lament (bars 8-23), ornamented
    mel = [('E4', 1), ('F4', .5), ('G#4', 1.5), ('A4', 1), ('G#4', 1), ('F4', 1), ('E4', 2),
           ('B4', 1), ('C5', .5), ('B4', .5), ('A4', 1), ('G#4', 1), ('A4', 1), ('B4', 3),
           ('C5', 1), ('D5', 1), ('C5', .5), ('B4', .5), ('A4', 1), ('G#4', 2), ('F4', 1), ('E4', 1),
           ('F4', 1), ('G#4', 1), ('F4', .5), ('E4', .5), ('D4', 1), ('E4', 4)]
    for start in (8 * bar, 16 * bar):
        t = start
        for nm, beats in mel:
            if t > D - 2: break
            d = beats * beat
            if d >= beat and r.random() < .4:   # grace note from above
                T.put(reed(hz(nm) * 2 ** (2 / 12), .07, .01, .03, seed=int(t * 50)), t - .07, pan=.1, gain=.26, send='hall', amt=.4)
            T.put(reed(hz(nm), d * .96, .05, .2, seed=int(t * 50)), t, pan=.1, gain=.44, send='hall', amt=.45)
            t += d
    # low choir "ah" for the climb (bars 20-27)
    T.put(choir([hz('E3'), hz('B3')], bar * 4 + 2, 'ah', 3, 2., 2.5, seed=401), 20 * bar, gain=.3, send='hall', amt=.6)
    T.put(choir([hz('F3'), hz('C4')], bar * 4 + 2, 'ah', 3, 1.5, 2.5, seed=402), 24 * bar, gain=.3, send='hall', amt=.6)
    # embers: a faint crackle bed
    n = T.n; cr = np.zeros(n); pos = r.integers(0, n - 2000, int(D * 5))
    for p in pos: cr[p:p + 200] += r.uniform(-1, 1) * np.exp(-np.arange(200) / 25.)
    T.put(filt(cr, 'band', (1500, 6000)) * .05, 0, gain=1.)
    ir = make_ir(3.2, 7, 1.1, .02); ir2 = make_ir(1., 8, 1.3)
    write('reg-ash', *T.render({'hall': (ir, 1.), 'room': (ir2, 1.)}, -15, warm=11000, air=5))

def abyss():
    """The Abyss: C locrian, 50 bpm — a sub drone that beats, a dark choir cluster, struck metal, singing glass"""
    D = length(96.); T = Track(D, 9, 51); r = rng(51); n = int((D + 1) * SR); t = tt(n)
    n = int((D + 4) * SR); t = tt(n)
    sub = (np.sin(2 * np.pi * hz('C1') * t) + np.sin(2 * np.pi * hz('C1') * 1.008 * t) + .5 * np.sin(2 * np.pi * hz('Gb1') * t)) * smooth_noise(n, .1, 2, .55, 1.)
    T.put(circ(sub * .5, D, 4.), 0, gain=.55)
    for k, (t0, cl, v) in enumerate(((0, ['C3', 'Db3', 'Gb3'], 'oo'), (22, ['B2', 'C3', 'F3'], 'ah'), (44, ['C3', 'Eb3', 'Gb3'], 'oh'), (66, ['Db3', 'C3', 'G3'], 'oo'))):
        T.put(choir([hz(x) for x in cl], 30 if k < 3 else 36, v, 3, 5, 6, seed=k * 11), t0, gain=.42, send='hall', amt=.9)
    for k in range(16):
        t0 = 3 + k * 5.6 + r.uniform(-1, 1)
        if t0 > D - 4: break
        f = hz(['C3', 'Gb3', 'Db3', 'G2'][k % 4]) * r.choice([1, 1, 2])
        T.put(metal(f, 9, seed=k, decay=r.uniform(3, 6)), t0, pan=r.uniform(-.8, .8), gain=.13, send='hall', amt=1.1)
    for k in range(10):
        t0 = r.uniform(5, max(6, D - 10)); f = hz(['C6', 'Db6', 'Gb6', 'B5'][k % 4])
        T.put(glass(f, 8, 3, 3, 3.3, seed=k + 70) * .6, t0, pan=r.uniform(-.9, .9), gain=.12, send='hall', amt=1.2)
    for t0 in (20, 42, 64, 86):
        sw = filt(r.standard_normal(int(4 * SR)), 'band', (200, 1800)) * np.linspace(0, 1, int(4 * SR)) ** 4
        T.put(sw / (np.abs(sw).max() + 1e-9), t0 - 2, gain=.12, send='hall', amt=1.)
        T.put(drum(55, 30, .2, 4, 1.4, .2, seed=int(t0), skinlp=200), t0 + 2, gain=.5, send='hall', amt=.9)
    ir = make_ir(8., 9, 1.3, .06, 1.3)
    write('reg-abyss', *T.render({'hall': (ir, 1.2)}, -17, hp=28, warm=9000, air=3))

# ---------------- ambience beds (seamless loops) ----------------
def loopify(L, R, xf=3.):
    L = filt(L, 'high', 25); R = filt(R, 'high', 25)     # no DC (the rumble beds are integrated noise)
    k = int(xf * SR); a = np.linspace(0, 1, k)
    L2 = L[:-k].copy(); R2 = R[:-k].copy()
    L2[:k] = L2[:k] * np.sqrt(a) + L[-k:] * np.sqrt(1 - a); R2[:k] = R2[:k] * np.sqrt(a) + R[-k:] * np.sqrt(1 - a)
    return L2, R2
def norm(L, R, db):
    rms = np.sqrt(((L ** 2 + R ** 2) / 2).mean()) + 1e-9; g = 10 ** (db / 20) / rms
    L, R = np.tanh(L * g * 1.05) / 1.05, np.tanh(R * g * 1.05) / 1.05
    return L, R
def addp(L, R, x, t0, pan=0., gain=1.):
    """add mono x at t0 seconds with an equal-power pan, clipped to the buffer"""
    i0 = int(round(t0 * SR)); n = len(L)
    if i0 < 0: x = x[-i0:]; i0 = 0
    k = min(len(x), n - i0)
    if k <= 0: return
    a = (pan + 1) * np.pi / 4
    L[i0:i0 + k] += x[:k] * gain * np.cos(a) * 1.41421; R[i0:i0 + k] += x[:k] * gain * np.sin(a) * 1.41421
def wind_layer(n, seed, lo, hi, rate=.12, gust=.5):
    r = rng(seed); x = r.standard_normal(n)
    a = filt(x, 'band', (lo, hi), 2); b = filt(r.standard_normal(n), 'band', (lo * 1.6, hi * 1.5), 2)
    m1 = smooth_noise(n, rate, seed + 1, .15, 1.); m2 = smooth_noise(n, rate * 1.7, seed + 2, 0, 1.)
    return a * m1 + b * m2 * gust
def amb_frost():
    D = length(42.) + 3; n = int(D * SR); r = rng(61)
    # falling snow: a soft high hush that breathes very slowly, and the lightest air low down
    hush = lambda sd: filt(rng(sd).standard_normal(n), 'band', (3000, 8000), 2) * smooth_noise(n, .05, sd + 1, .3, 1.) * .028
    L = hush(1) + filt(rng(3).standard_normal(n), 'low', 380) * smooth_noise(n, .04, 4, .2, 1.) * .1
    R = hush(2) + filt(rng(5).standard_normal(n), 'low', 380) * smooth_noise(n, .04, 6, .2, 1.) * .1
    # ice chimes: little clusters of struck crystal, D lydian up high
    scale = [hz(x) for x in ('D6', 'E6', 'F#6', 'G#6', 'A6', 'B6', 'C#7', 'D7', 'E7')]
    t0 = 1.
    while t0 < D - 3:
        for j in range(int(r.integers(2, 6))):
            addp(L, R, tinkle(scale[int(r.integers(0, len(scale)))], 1.8, int(r.integers(0, 1e6))) * r.uniform(.05, .1), t0 + j * r.uniform(.07, .22), r.uniform(-.9, .9), 1.)
        t0 += r.uniform(2.5, 5.5)
    # ice creaks and ticks
    for k in range(9):
        t0 = r.uniform(1, D - 2); ln = int(r.uniform(.15, .5) * SR)
        cr = np.zeros(ln); rate = r.uniform(40, 120); ph = np.cumsum(np.full(ln, rate / SR) * (1 + .5 * np.sin(np.linspace(0, 3, ln))))
        cr[np.where(np.diff(np.floor(ph)) > 0)[0]] = 1
        cr = filt(cr, 'band', (r.uniform(1200, 2500), r.uniform(3000, 5000))) * np.sin(np.linspace(0, np.pi, ln))
        addp(L, R, cr, t0, r.uniform(-1, 1), .22)
    addp(L, R, howl(7) * .07, 19., -.6, 1.)
    L, R = outdoor(L, R, n, .45, make_ir(4., 33, 1.1, .04))
    L, R = loopify(L, R); L, R = norm(L, R, -22.)
    write('amb-frost', L, R, 64)
def amb_cursed():
    D = length(44.) + 3; n = int(D * SR); r = rng(71); t = tt(n)
    # an uneasy low drone (two tones beating slowly) instead of wind
    dr = (np.sin(2 * np.pi * 49 * t) + .7 * np.sin(2 * np.pi * 51.7 * t) + .3 * np.sin(2 * np.pi * 98.4 * t)) * smooth_noise(n, .05, 3, .3, 1.)
    dr += filt(r.standard_normal(n), 'band', (180, 420), 2) * smooth_noise(n, .07, 4, 0, 1.) ** 2 * .5
    L = dr * .07; R = dr * .07
    for k in range(4):                        # crows somewhere in the dead trees
        addp(L, R, filt(caw(int(r.integers(0, 1e6))), 'low', 3500) * .2, r.uniform(2, D - 4), r.uniform(-1, 1), 1.)
    for k in range(14):                       # water dripping from branches
        addp(L, R, drip(int(r.integers(0, 1e6))) * .1, r.uniform(1, D - 1), r.uniform(-.9, .9), 1.)
    for k in range(7):                        # frogs in the bog
        addp(L, R, filt(croak(int(r.integers(0, 1e6)), r.uniform(120, 170)), 'low', 1200) * .1, r.uniform(1, D - 2), r.uniform(-1, 1), 1.)
    # dead branches creaking
    for k in range(10):
        t0 = r.uniform(1, D - 3); i0 = int(t0 * SR); ln = int(r.uniform(.6, 1.6) * SR)
        rate = np.linspace(r.uniform(18, 30), r.uniform(40, 80), ln) * (1 + .3 * np.sin(np.linspace(0, 6, ln)))
        ph = np.cumsum(rate / SR); imp = np.zeros(ln); imp[np.where(np.diff(np.floor(ph)) > 0)[0]] = 1
        cr = filt(imp, 'band', (300, 650)) + .6 * filt(imp, 'band', (900, 1400)) + .3 * filt(imp, 'band', (2000, 2600))
        cr *= np.sin(np.linspace(0, np.pi, ln)) ** 2
        addp(L, R, cr, t0, r.uniform(-1, 1), .45)
    owl(L, R, 9.5); owl(L, R, 31.)
    # whispers
    for k in range(5):
        t0 = r.uniform(2, D - 4); i0 = int(t0 * SR); tot = int(2.2 * SR); x = np.zeros(tot); tt0 = 0
        for s in range(int(r.integers(3, 7))):
            ln = r.uniform(.08, .2); ns = int(ln * SR); v = r.choice(['oo', 'ah', 'oh']); src = r.standard_normal(ns); seg = np.zeros(ns)
            for F, B, g in FORM[v]: seg += g * filt(src, 'band', (F * 1.1 - B, F * 1.1 + B * 2))
            seg = (seg + .6 * filt(src, 'band', (3000, 7000))) * np.sin(np.linspace(0, np.pi, ns)) ** 1.5
            j0 = int(tt0 * SR)
            if j0 + ns < tot: x[j0:j0 + ns] += seg
            tt0 += ln + r.uniform(.02, .1)
        x = x / (np.abs(x).max() + 1e-9) * .12; addp(L, R, x, t0, r.uniform(-1, 1), .5)
    ir = make_ir(3., 13, 1.2)
    L = L + sg.fftconvolve(L, ir[0])[:n] * .5; R = R + sg.fftconvolve(R, ir[1])[:n] * .5
    L, R = loopify(L, R); L, R = norm(L, R, -21.)
    write('amb-cursed', L, R, 64)
def amb_ash():
    D = length(40.) + 3; n = int(D * SR); r = rng(81)
    br = np.cumsum(r.standard_normal(n)); br = filt(br - filt(br, 'low', 8), 'low', 140)
    br /= np.abs(br).max() + 1e-9; rum = br * smooth_noise(n, .15, 3, .5, 1.)
    L = rum * .9; R = rum * .85
    # lava bubbling: low blops
    for k in range(int(D * 2.2)):
        t0 = r.uniform(0, D - 1); i0 = int(t0 * SR); ln = int(r.uniform(.08, .2) * SR); f = np.linspace(r.uniform(90, 160), r.uniform(50, 80), ln)
        bl = sine(f, ln) * np.sin(np.linspace(0, np.pi, ln)) ** 2 * r.uniform(.15, .35); addp(L, R, bl, t0, r.uniform(-.6, .6), .5)
    # crackle
    cr = np.zeros(n)
    for p in r.integers(0, n - 300, int(D * 22)): cr[p:p + 300] += r.uniform(-1, 1) * r.random() ** 2 * np.exp(-np.arange(300) / 18.)
    cr = filt(cr, 'band', (1800, 7000)) * .35
    L += cr; R += np.roll(cr, 331)
    # far eruptions
    for t0 in (11., 29.):
        addp(L, R, drum(48, 28, .3, 4, 1.6, .6, seed=int(t0), skinlp=250) * .7, t0, -.05, 1.)
    ir = make_ir(2.5, 14, 1.)
    L = L + sg.fftconvolve(L, ir[0])[:n] * .35; R = R + sg.fftconvolve(R, ir[1])[:n] * .35
    L, R = loopify(L, R); L, R = norm(L, R, -19.5)
    write('amb-ash', L, R, 64)
def amb_abyss():
    D = length(44.) + 3; n = int(D * SR); r = rng(91); t = tt(n)
    hum = (np.sin(2 * np.pi * 55 * t) + .45 * np.sin(2 * np.pi * 55.6 * t) + .5 * np.sin(2 * np.pi * 82.5 * t) + .25 * np.sin(2 * np.pi * 83.3 * t)) * smooth_noise(n, .08, 5, .5, 1.)
    L = hum * .3; R = hum * .3
    for k in range(12):                       # drips echoing in the deep
        addp(L, R, drip(int(r.integers(0, 1e6)), True) * .09, r.uniform(1, D - 1), r.uniform(-.9, .9), 1.)
    for k in range(int(D * .6)):              # slow deep bubbles rising
        ln = int(r.uniform(.12, .3) * SR); f = np.linspace(r.uniform(60, 90), r.uniform(120, 180), ln)
        addp(L, R, sine(f, ln) * np.sin(np.linspace(0, np.pi, ln)) ** 2 * r.uniform(.12, .25), r.uniform(0, D - 1), r.uniform(-.6, .6), .5)
    # moans far away: formant voices gliding
    for k in range(4):
        t0 = r.uniform(2, D - 8); d = r.uniform(4, 7); m_ = int(d * SR); f = np.linspace(r.uniform(110, 160), r.uniform(70, 100), m_)
        src = saw(f, m_, r.random()); y = np.zeros(m_)
        for F, B, g in FORM[r.choice(['oo', 'oh'])]: y += g * filt(src, 'band', (F - B, F + B))
        y = filt(y, 'low', 1200) * env_ar(m_, 1.5, 2.5) * .25; addp(L, R, y, t0, r.uniform(-1, 1), .5)
    for k in range(5):
        t0 = r.uniform(1, D - 9); g = glass(r.choice([1046.5, 1108.7, 1480., 1567.98]), 8, 3, 3.5, 3.1, seed=k) * .07; addp(L, R, g, t0, r.uniform(-1, 1), .5)
    ir = make_ir(6., 15, 1.3)
    L = L + sg.fftconvolve(L, ir[0])[:n] * .6; R = R + sg.fftconvolve(R, ir[1])[:n] * .6
    L, R = loopify(L, R); L, R = norm(L, R, -20.5)
    write('amb-abyss', L, R, 64)

# ---------------- sounds of living places (2026-11-20: the beds lose their wind) ----------------
def chirp(f0, f1, dur, shape=1., fm=0., fmr=0., h2=.12):
    """a bird note: a pure tone sliding f0 -> f1, a little vibrato, soft ends"""
    n = max(8, int(dur * SR)); x = np.linspace(0, 1, n); f = f0 + (f1 - f0) * x ** shape
    if fm: f = f * (1 + fm * np.sin(2 * np.pi * fmr * tt(n)))
    return (sine(f, n) + h2 * sine(2 * f, n)) * np.sin(np.pi * x) ** .7 * (1 - .35 * x)
def gap(sec): return np.zeros(max(1, int(sec * SR)))
def bird(kind, seed):
    r = rng(seed); seg = []
    if kind == 'warbler':                     # a quick tumbling phrase
        for i in range(int(r.integers(5, 10))):
            f0 = r.uniform(2600, 4800); seg += [chirp(f0, f0 * r.uniform(.72, 1.3), r.uniform(.05, .13), r.uniform(.5, 2.), .03, r.uniform(30, 80)), gap(r.uniform(.02, .07))]
    elif kind == 'whistle':                   # two clear notes, the second lower
        f = r.uniform(3100, 3700); seg = [chirp(f, f * 1.01, .3), gap(.07), chirp(f * .86, f * .84, .36)]
    elif kind == 'trill':                     # a dry rattle of tiny chirps
        rate = r.uniform(12, 19); f = r.uniform(4200, 6000)
        for i in range(int(r.uniform(.6, 1.1) * rate)): seg += [chirp(f * 1.12, f * .9, .034), gap(1 / rate - .034)]
    elif kind == 'robin':                     # rising and falling carols
        for i in range(int(r.integers(3, 6))):
            f = r.uniform(2000, 3200); seg += [chirp(f, f * r.uniform(1.15, 1.45), r.uniform(.1, .18), .7, .02, 40), chirp(f * 1.3, f * .95, r.uniform(.08, .14), 1.4), gap(r.uniform(.12, .3))]
    elif kind == 'cuckoo':                    # cu-ckoo, far off, low and hollow
        f = r.uniform(680, 760); seg = [chirp(f, f * .97, .26, h2=.03), gap(.13), chirp(f * .8, f * .78, .42, h2=.03)]
    return np.concatenate(seg)
def leaves(n, seed, level):
    """leaves stirring, not wind: a light high rustle in small fluttering bursts"""
    r = rng(seed); hiss = filt(r.standard_normal(n), 'band', (2000, 8000), 2)
    flutter = smooth_noise(n, 16, seed + 1, 0, 1) ** 4; swell = smooth_noise(n, .06, seed + 2, .1, 1.) ** 2
    return hiss * (.12 + flutter) * swell * level
def crickets(n, seed, level, count=3):
    """field crickets: each one a carrier around 4.5 kHz gated into chirps of three to four pulses"""
    r = rng(seed); t = tt(n); L = np.zeros(n); R = np.zeros(n)
    for k in range(count):
        f = r.uniform(4100, 5300); rate = r.uniform(1.8, 3.2); pulses = r.integers(3, 5); pr = r.uniform(26, 34)
        ph = (t * rate + r.random()) % 1; pp = (t * pr) % 1
        g = ((ph < pulses * rate / pr) & (pp < .55)).astype(float)
        g = filt(g, 'low', 260) * smooth_noise(n, .05, seed + 10 + k, .4, 1.)
        y = np.sin(2 * np.pi * f * t + r.random() * 6) * g * r.uniform(.5, 1.) * level
        pan = r.uniform(-.9, .9); a = (pan + 1) * np.pi / 4; L += y * np.cos(a); R += y * np.sin(a)
    return L, R
def drip(seed, big=False):
    """a water drop: a short upward 'plink' and a ring"""
    r = rng(seed); n = int(.18 * SR); x = tt(n); f0 = r.uniform(700, 1100) * (.6 if big else 1)
    f = f0 * (1 + 1.4 * (1 - np.exp(-x * 90))); return sine(f, n) * np.exp(-x * (28 if big else 38)) * (1 - np.exp(-x * 2500))
def caw(seed):
    """a crow: two or three harsh caws"""
    r = rng(seed); seg = []
    for i in range(int(r.integers(2, 4))):
        ns = int(r.uniform(.24, .32) * SR); f = np.linspace(r.uniform(430, 520), r.uniform(330, 380), ns); src = saw(f, ns, r.random()) + .5 * r.standard_normal(ns) * .3
        y = np.zeros(ns)
        for F, B, g in FORM['ah']: y += g * filt(src, 'band', (F * 1.15 - B, F * 1.15 + B * 1.4))
        y *= np.sin(np.linspace(0, np.pi, ns)) ** .5 * np.exp(-np.linspace(0, 1.4, ns)); seg += [y / (np.abs(y).max() + 1e-9), gap(r.uniform(.25, .42))]
    return np.concatenate(seg)
def croak(seed, f0=None):
    """a frog: a low buzzing croak or two"""
    r = rng(seed); seg = []
    for i in range(int(r.integers(1, 3))):
        ns = int(r.uniform(.18, .32) * SR); f = (f0 or r.uniform(140, 220)) * (1 + .08 * np.linspace(1, -1, ns)); src = saw(f, ns, r.random())
        y = filt(src, 'band', (280, 1100)) + .4 * filt(src, 'band', (1500, 2200)); y *= (np.sin(np.linspace(0, np.pi, ns)) ** .4) * (.6 + .4 * np.sin(2 * np.pi * 34 * tt(ns)))
        seg += [y / (np.abs(y).max() + 1e-9), gap(r.uniform(.12, .3))]
    return np.concatenate(seg)
def owl(L, R, t0, pan=-.25, gain=.65):
    for off, ln in ((0, .45), (.85, .2), (1.1, .5)):
        m_ = int(ln * SR); f = 360 * (1 + .06 * np.sin(np.linspace(0, np.pi, m_)))
        h = sine(f, m_) * np.sin(np.linspace(0, np.pi, m_)) ** 2; addp(L, R, filt(h, 'low', 900) * .18, t0 + off, pan, gain)
def tinkle(f, dur=1.8, seed=0):
    """an ice chime: a struck crystal, inharmonic partials ringing out"""
    n = int(dur * SR); t = tt(n); r = rng(seed); y = np.zeros(n)
    for k, a, d in ((1, 1., 2.6), (2.76, .42, 4.4), (5.4, .2, 7.5), (8.93, .09, 11.)): y += a * np.sin(2 * np.pi * f * k * t + r.random() * 6) * np.exp(-t * d)
    return y * (1 - np.exp(-t * 900))
def howl(seed):
    """a wolf far away: a long gliding call"""
    r = rng(seed); d = r.uniform(3.2, 4.2); n = int(d * SR); x = np.linspace(0, 1, n)
    f = np.interp(x, [0, .22, .7, 1], [r.uniform(330, 380), r.uniform(560, 640), r.uniform(540, 600), r.uniform(380, 430)]) * vibrato(n, 5.2, .012, .5, seed)
    src = saw(f, n, r.random()); y = np.zeros(n)
    for F, B, g in FORM['oo']: y += g * filt(src, 'band', (F * 1.5 - B, F * 1.5 + B * 2))
    y = filt(y + .3 * sine(f, n), 'low', 1600) * env_ar(n, .5, 1.2); return y / (np.abs(y).max() + 1e-9)
def outdoor(L, R, n, wet, ir):
    return L + sg.fftconvolve(L, ir[0])[:n] * wet, R + sg.fftconvolve(R, ir[1])[:n] * wet
def amb_kingdom():
    D = length(46.) + 3; n = int(D * SR); r = rng(101)
    L = leaves(n, 1, .5); R = leaves(n, 2, .5)
    cl, cr_ = crickets(n, 3, .05, 2); L += cl; R += cr_
    kinds = ['warbler', 'whistle', 'robin', 'trill', 'warbler', 'robin']
    t0 = .6
    while t0 < D - 3:
        k = kinds[int(r.integers(0, len(kinds)))]; y = bird(k, int(r.integers(0, 1e6))); far = r.random() < .45
        if far: y = filt(y, 'low', 3200) * .45
        pan = r.uniform(-.95, .95); addp(L, R, y * .5, t0, pan, 1.)
        if r.random() < .5:                      # another of its kind answers from the other side
            addp(L, R, bird(k, int(r.integers(0, 1e6))) * (.22 if far else .3), t0 + len(y) / SR + r.uniform(.5, 1.6), -pan * .8, 1.)
        t0 += r.uniform(1.4, 3.4)
    for t1 in (8., 30.):
        cu = bird('cuckoo', int(t1)); cu = filt(cu, 'low', 1800) * .32
        for rep in range(3): addp(L, R, cu, t1 + rep * 1.15, .55, 1.)
    L, R = outdoor(L, R, n, .22, make_ir(1.6, 31, 1.4, .02))
    L, R = loopify(L, R); L, R = norm(L, R, -23.)
    write('amb-kingdom', L, R, 64)
def amb_night():
    D = length(44.) + 3; n = int(D * SR); r = rng(111)
    L, R = crickets(n, 5, .16, 5)
    L += leaves(n, 6, .18); R += leaves(n, 7, .18)
    for k in range(9):
        t0 = r.uniform(1, D - 3); addp(L, R, filt(croak(int(r.integers(0, 1e6)), r.uniform(150, 200)), 'low', 1400) * .16, t0, r.uniform(-1, -.2), 1.)
    owl(L, R, 6.5, .35, .8); owl(L, R, 27., -.4, .6)
    # a nightjar's long churr far off
    ns = int(4.5 * SR); ch = sine(np.full(ns, 1900.) * (1 + .03 * np.sin(2 * np.pi * .7 * tt(ns))), ns) * ((tt(ns) * 38) % 1 < .5) * env_ar(ns, .6, 1.)
    addp(L, R, filt(ch, 'band', (1200, 2600)) * .05, 16., .7, 1.)
    L, R = outdoor(L, R, n, .3, make_ir(2.2, 32, 1.2, .03))
    L, R = loopify(L, R); L, R = norm(L, R, -24.)
    write('amb-night', L, R, 64)

JOBS = {'kingdom': kingdom, 'cursed': cursed, 'frost': frost, 'ash': ash, 'abyss': abyss,
        'amb-kingdom': amb_kingdom, 'amb-night': amb_night,
        'amb-frost': amb_frost, 'amb-cursed': amb_cursed, 'amb-ash': amb_ash, 'amb-abyss': amb_abyss}
if __name__ == '__main__':
    for name, job in JOBS.items():
        if ONLY and name not in ONLY: continue
        job()
