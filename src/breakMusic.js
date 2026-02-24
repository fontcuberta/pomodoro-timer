/**
 * Break music – bouncy cartoon-style tune (Popeye/Looney Tunes vibe)
 * Synthesized with Web Audio API, no external files.
 */

let audioContext = null
let loopTimeoutId = null
let masterGain = null

// C major scale (Hz) – cartoon melody
const NOTE = {
  C3: 131, D3: 147, E3: 165, F3: 175, G3: 196, A3: 220, B3: 247,
  C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494,
  C5: 523, D5: 587, E5: 659,
}

// Bouncy cartoon melody – [freq, duration in beats, gain] (Popeye/Looney Tunes vibe)
const MELODY = [
  [NOTE.C4, 0.5, 0.3],
  [NOTE.E4, 0.5, 0.3],
  [NOTE.G4, 0.5, 0.35],
  [NOTE.C5, 1, 0.38],
  [NOTE.G4, 0.5, 0.32],
  [NOTE.E4, 0.5, 0.3],
  [NOTE.G4, 1, 0.35],
  [NOTE.C4, 1.5, 0.4],
  [NOTE.G3, 0.5, 0.28],
  [NOTE.C4, 0.5, 0.3],
  [NOTE.E4, 0.5, 0.32],
  [NOTE.G4, 0.5, 0.35],
  [NOTE.E4, 0.5, 0.3],
  [NOTE.C4, 0.5, 0.3],
  [NOTE.G3, 1.5, 0.38],
]

// Bass oom-pah [freq, duration, gain]
const BASS = [
  [NOTE.C3, 0.5, 0.5],
  [NOTE.G3, 0.5, 0.4],
  [NOTE.C3, 0.5, 0.5],
  [NOTE.G3, 0.5, 0.4],
]

const BPM = 115
const BEAT = 60 / BPM

function getContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    masterGain = audioContext.createGain()
    masterGain.gain.value = 0.4
    masterGain.connect(audioContext.destination)
  }
  return audioContext
}

function playNote(freq, duration, gainVol, type = 'triangle') {
  try {
    const ctx = getContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(masterGain ?? ctx.destination)

    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(gainVol * 0.6, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.9)

    osc.start(now)
    osc.stop(now + duration)
  } catch {
    // Audio unavailable
  }
}

function playMelodyPhrase(startTime) {
  try {
    const ctx = getContext()
    let t = startTime

    MELODY.forEach(([freq, beats, vol]) => {
      const dur = beats * BEAT
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      osc.connect(gain)
      gain.connect(masterGain ?? ctx.destination)
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(vol * 0.5, t + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.85)
      osc.start(t)
      osc.stop(t + dur)
      t += dur
    })
  } catch {
    // Audio unavailable
  }
}

function playBassPhrase(startTime) {
  try {
    const ctx = getContext()
    const phraseBeats = MELODY.reduce((s, [, b]) => s + b, 0)
    const bassBeats = BASS.reduce((s, [, b]) => s + b, 0)
    const repeats = Math.ceil(phraseBeats / bassBeats)
    let t = startTime

    for (let i = 0; i < repeats; i++) {
      BASS.forEach(([freq, beats, vol]) => {
        const dur = beats * BEAT
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        osc.connect(gain)
        gain.connect(masterGain ?? ctx.destination)
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(vol * 0.4, t + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.9)
        osc.start(t)
        osc.stop(t + dur)
        t += dur
      })
    }
  } catch {
    // Audio unavailable
  }
}

function getPhraseDuration() {
  const melodyBeats = MELODY.reduce((sum, [, beats]) => sum + beats, 0)
  return melodyBeats * BEAT
}

export function startBreakMusic() {
  try {
    const ctx = getContext()
    if (ctx.state === 'suspended') ctx.resume()

    const phraseDur = getPhraseDuration()

    function scheduleLoop() {
    const now = ctx.currentTime
    playMelodyPhrase(now)
    playBassPhrase(now)
      loopTimeoutId = setTimeout(scheduleLoop, phraseDur * 1000)
    }

    scheduleLoop()
  } catch {
    // Audio unavailable
  }
}

export function stopBreakMusic() {
  if (loopTimeoutId) {
    clearTimeout(loopTimeoutId)
    loopTimeoutId = null
  }
}
