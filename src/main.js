import './style.css'
import { createTimer, formatTime } from './timer.js'
import { getRandomFact } from './facts.js'
import { AVATARS, getAvatarUrl } from './avatars.js'
import { startBreakMusic, stopBreakMusic, unlockBreakMusic } from './breakMusic.js'

const USERNAME_KEY = 'pomodoro-username'
const AVATAR_KEY = 'pomodoro-avatar'
const DURATION_PRESET_KEY = 'pomodoro-duration-preset'
const BREAK_MUSIC_KEY = 'pomodoro-break-music'

const DURATION_PRESETS = [
  { id: '25-5', work: 25 * 60, break: 5 * 60, label: '25 min / 5 min' },
  { id: '5-1', work: 5 * 60, break: 1 * 60, label: '5 min / 1 min' },
  { id: '10-5', work: 10 * 60, break: 5 * 60, label: '10 min / 5 min' },
  { id: '10s-5s', work: 10, break: 5, label: '10 sec / 5 sec' },
]

const MODE_LABELS = {
  work: 'Work',
  break: 'Break',
}

function playCompletionSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const t0 = ctx.currentTime
    // Low thud – burger/tomato hitting the ground
    const thud = ctx.createOscillator()
    const thudGain = ctx.createGain()
    thud.type = 'sine'
    thud.frequency.value = 55
    thud.connect(thudGain)
    thudGain.connect(ctx.destination)
    thudGain.gain.setValueAtTime(0, t0)
    thudGain.gain.linearRampToValueAtTime(0.45, t0 + 0.02)
    thudGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25)
    thud.start(t0)
    thud.stop(t0 + 0.3)
    // Squish layer – wet splat
    const splat = ctx.createOscillator()
    const splatGain = ctx.createGain()
    splat.type = 'triangle'
    splat.frequency.setValueAtTime(180, t0)
    splat.frequency.exponentialRampToValueAtTime(60, t0 + 0.15)
    splat.connect(splatGain)
    splatGain.connect(ctx.destination)
    splatGain.gain.setValueAtTime(0, t0)
    splatGain.gain.linearRampToValueAtTime(0.2, t0 + 0.01)
    splatGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12)
    splat.start(t0)
    splat.stop(t0 + 0.15)
  } catch {
    // Audio not supported or blocked
  }
}

function showNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body })
      }
    })
  }
}

function notifyModeComplete(mode) {
  const title = mode === 'work' ? 'Work session complete!' : 'Break over!'
  const body =
    mode === 'work'
      ? 'Time for a break!'
      : 'Ready to focus again!'
  playCompletionSound()
  showNotification(title, body)
}

const initialUsername = (localStorage.getItem(USERNAME_KEY) || '').replace(/"/g, '&quot;')
const initialAvatar = localStorage.getItem(AVATAR_KEY) || 'tomato'
const initialPresetId = localStorage.getItem(DURATION_PRESET_KEY) || '25-5'
const initialPreset = DURATION_PRESETS.find((p) => p.id === initialPresetId) || DURATION_PRESETS[0]
const initialBreakMusicOn = localStorage.getItem(BREAK_MUSIC_KEY) !== 'false'

// Emoji rain – tomatoes, plants & leaves dropping from the sky
const tomatoRain = document.getElementById('tomato-rain')
const EMOJI_RAIN = ['🍅', '🪴', '🍃', '🌸', '🌿']
const EMOJI_COUNT = 14
for (let i = 0; i < EMOJI_COUNT; i++) {
  const span = document.createElement('span')
  span.className = 'tomato-rain__emoji'
  span.textContent = EMOJI_RAIN[i % EMOJI_RAIN.length]
  span.style.setProperty('--delay', `${(i / EMOJI_COUNT) * 16}s`)
  span.style.setProperty('--x', `${(i * 13) % 100}%`)
  span.style.setProperty('--size', `${56 + (i % 7) * 14}px`)
  span.style.setProperty('--wiggle-x', `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 5) * 4)}px`)
  tomatoRain.appendChild(span)
}

document.querySelector('#app').innerHTML = `
  <div class="app-wrapper">
    <div class="card">
      <button type="button" class="card__hint" aria-label="Show hint" data-tooltip="Rebrand on the fly! 👆 Click your face or name — they're yours to change anytime.">Hint!</button>
      <section class="user-profile">
        <div class="user-profile__avatar-section">
          <button id="avatar-trigger" type="button" class="avatar-trigger" aria-haspopup="dialog" aria-label="Change avatar">
            <img id="avatar-display" class="avatar-display" src="${getAvatarUrl(AVATARS.find((a) => a.id === initialAvatar) || AVATARS[0])}" alt="" />
            <span class="avatar-trigger__badge">Change</span>
          </button>
        </div>
        <div id="avatar-modal" class="avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title" aria-hidden="true">
          <div class="avatar-modal__backdrop"></div>
          <div class="avatar-modal__panel">
            <div class="avatar-modal__header">
              <h2 id="avatar-modal-title" class="avatar-modal__title">Choose your avatar</h2>
              <button type="button" class="avatar-modal__close" aria-label="Close">×</button>
            </div>
            <div class="avatar-modal__grid">
              ${AVATARS.map(
                (a) =>
                  `<button type="button" class="avatar-modal__option ${a.id === initialAvatar ? 'avatar-modal__option--selected' : ''}" data-avatar="${a.id}" aria-label="Select ${a.label}"><img src="${getAvatarUrl(a)}" alt="" width="64" height="64" /><span class="avatar-modal__label">${a.label}</span></button>`
              ).join('')}
            </div>
          </div>
        </div>
        <div class="user-profile__title-section">
          <h1 class="app-title">
            <span id="username-editable" class="username-editable" contenteditable="true" role="textbox" aria-label="Your name, click to edit" data-placeholder="Your name">${(initialUsername || 'Your name').replace(/&quot;/g, '"')}</span><span class="app-title__suffix">'s Pomodoro Timer</span>
          </h1>
        </div>
      </section>

      <main class="pomodoro-timer" role="application" aria-label="Pomodoro timer">
        <div class="duration-presets">
          <label for="duration-preset" class="duration-presets__label">Work / Break</label>
          <select id="duration-preset" class="duration-presets__select" aria-label="Select work and break duration">
            ${DURATION_PRESETS.map((p) => `<option value="${p.id}" ${p.id === initialPresetId ? 'selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </div>
        <div class="pomodoro-timer__header">
          <span id="mode-indicator" class="mode-indicator mode-indicator--work" aria-live="polite">
            Work
          </span>
        </div>
        <div class="pomodoro-timer__display">
          <time id="timer-display" class="timer-display" datetime="PT25M" aria-live="polite">
            25:00
          </time>
        </div>
        <div class="slot-progress slot-progress--work" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="Time elapsed in current slot">
          <div class="slot-progress__bar">
            <div id="slot-progress-fill" class="slot-progress__fill"></div>
          </div>
          <p id="slot-progress-label" class="slot-progress__label">0:00 / 25:00</p>
        </div>
        <div class="timer-controls">
          <button id="btn-start-pause" type="button" class="btn btn--primary" aria-pressed="false">
            Start
          </button>
          <button id="btn-reset" type="button" class="btn btn--secondary">
            Reset
          </button>
          <button id="btn-break-music" type="button" class="btn btn--icon" aria-pressed="${initialBreakMusicOn}" aria-label="Break music on/off" title="Break music on/off">
            <span id="break-music-icon">${initialBreakMusicOn ? '🔊' : '🔇'}</span>
          </button>
        </div>
      </main>

      <section class="fun-facts fun-facts--locked" aria-disabled="true">
        <h2 class="fun-facts__heading">Did you know?</h2>
        <p id="fun-fact" class="fun-fact" aria-live="polite"></p>
        <button id="btn-next-fact" type="button" class="btn fun-facts__btn">Next fact</button>
        <div id="fun-facts-toast" class="fun-facts__toast" role="alert" aria-live="polite"></div>
      </section>
    </div>
    <footer class="app-footer">
      <a href="https://vite.dev" target="_blank" rel="noopener" class="footer-link">
        <img src="/vite.svg" class="footer-logo" alt="Vite" width="20" height="20" />
        <span>Vite + vanilla JS</span>
      </a>
    </footer>
  </div>
`

const modeIndicator = document.querySelector('#mode-indicator')
const timerDisplay = document.querySelector('#timer-display')
const btnStartPause = document.querySelector('#btn-start-pause')
const btnReset = document.querySelector('#btn-reset')

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `PT${m}M${s}S`
}

let previousMode = 'work'

function getSlotDuration(mode) {
  const { work, break: br } = timer.getDurations()
  return mode === 'work' ? work : br
}

function updateUI(state) {
  const modeChanged = state.currentMode !== previousMode

  timerDisplay.textContent = formatTime(state.timeRemaining)
  timerDisplay.datetime = formatDuration(state.timeRemaining)
  modeIndicator.textContent = MODE_LABELS[state.currentMode]
  modeIndicator.className = `mode-indicator mode-indicator--${state.currentMode}${modeChanged ? ' mode-indicator--switch' : ''}`
  btnStartPause.textContent = state.isRunning ? 'Pause' : 'Start'
  btnStartPause.setAttribute('aria-pressed', state.isRunning ? 'true' : 'false')

  const total = getSlotDuration(state.currentMode)
  const elapsed = total - state.timeRemaining
  const progressPct = total > 0 ? (elapsed / total) * 100 : 0
  const progressFill = document.getElementById('slot-progress-fill')
  const progressLabel = document.getElementById('slot-progress-label')
  if (progressFill && progressLabel) {
    progressFill.style.width = `${progressPct}%`
    progressFill.style.transition = state.isRunning ? 'width 1s linear' : 'width 0.2s ease'
    progressFill.classList.toggle('slot-progress__fill--growing', progressPct > 2)
    const totalSecs = getSlotDuration(state.currentMode)
    progressLabel.textContent = `${formatTime(elapsed)} / ${formatTime(totalSecs)}`
    const progressEl = document.querySelector('.slot-progress')
    progressEl.setAttribute('aria-valuenow', Math.round(progressPct))
    progressEl.className = `slot-progress slot-progress--${state.currentMode}`
  }

  const funFactsSection = document.querySelector('.fun-facts')
  if (funFactsSection) {
    funFactsSection.classList.toggle('fun-facts--locked', state.currentMode === 'work')
    funFactsSection.setAttribute('aria-disabled', state.currentMode === 'work' ? 'true' : 'false')
  }

  if (modeChanged && state.currentMode === 'work') {
    stopBreakMusic()
  }

  if (modeChanged) {
    previousMode = state.currentMode
    timerDisplay.classList.add('timer-display--switch')
    modeIndicator.addEventListener(
      'animationend',
      () => {
        modeIndicator.classList.remove('mode-indicator--switch')
      },
      { once: true }
    )
    timerDisplay.addEventListener(
      'animationend',
      () => {
        timerDisplay.classList.remove('timer-display--switch')
      },
      { once: true }
    )
  }
}

const timer = createTimer({ workDuration: initialPreset.work, breakDuration: initialPreset.break })

let breakMusicOn = initialBreakMusicOn

timer.onTick(updateUI)
timer.onModeComplete(({ currentMode }) => {
  notifyModeComplete(currentMode)
  if (currentMode === 'break') {
    if (breakMusicOn) startBreakMusic()
  } else {
    stopBreakMusic()
  }
})

btnStartPause.addEventListener('click', () => {
  unlockBreakMusic()
  timer.toggle()
})
btnReset.addEventListener('click', () => {
  unlockBreakMusic()
  stopBreakMusic()
  timer.reset()
})

const btnBreakMusic = document.getElementById('btn-break-music')
if (btnBreakMusic) {
  btnBreakMusic.addEventListener('click', () => {
    unlockBreakMusic()
    breakMusicOn = !breakMusicOn
    localStorage.setItem(BREAK_MUSIC_KEY, breakMusicOn)
    const icon = document.getElementById('break-music-icon')
    if (icon) icon.textContent = breakMusicOn ? '🔊' : '🔇'
    btnBreakMusic.setAttribute('aria-pressed', breakMusicOn)
    if (!breakMusicOn) {
      stopBreakMusic()
    } else if (timer.getState().currentMode === 'break') {
      startBreakMusic()
    }
  })
}

// Duration preset selector
const durationPresetSelect = document.getElementById('duration-preset')
durationPresetSelect.addEventListener('change', () => {
  unlockBreakMusic()
  stopBreakMusic()
  const preset = DURATION_PRESETS.find((p) => p.id === durationPresetSelect.value) || DURATION_PRESETS[0]
  timer.setDurations(preset.work, preset.break)
  timer.reset()
  localStorage.setItem(DURATION_PRESET_KEY, preset.id)
  updateUI(timer.getState())
})

// Initial render
updateUI(timer.getState())

// User profile - clickable editable username
const usernameEditable = document.getElementById('username-editable')

function saveUsername() {
  let username = usernameEditable.textContent.trim().replace(/\s+/g, ' ').slice(0, 32)
  if (!username) username = 'Your name'
  usernameEditable.textContent = username
  localStorage.setItem(USERNAME_KEY, username === 'Your name' ? '' : username)
}

usernameEditable.addEventListener('blur', saveUsername)
usernameEditable.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    usernameEditable.blur()
  }
})

function openAvatarModal() {
  const modal = document.getElementById('avatar-modal')
  modal.classList.add('avatar-modal--open')
  modal.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'
}

function closeAvatarModal() {
  const modal = document.getElementById('avatar-modal')
  modal.classList.remove('avatar-modal--open')
  modal.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
}

function updateAvatarDisplay(avatarId) {
  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0]
  const display = document.getElementById('avatar-display')
  const options = document.querySelectorAll('.avatar-modal__option')
  display.src = getAvatarUrl(avatar)
  display.alt = `Your avatar: ${avatar.label}`
  options.forEach((btn) => {
    btn.classList.toggle('avatar-modal__option--selected', btn.dataset.avatar === avatarId)
  })
  localStorage.setItem(AVATAR_KEY, avatarId)
}

document.getElementById('avatar-trigger').addEventListener('click', openAvatarModal)

document.getElementById('avatar-modal').querySelector('.avatar-modal__backdrop').addEventListener('click', closeAvatarModal)
document.getElementById('avatar-modal').querySelector('.avatar-modal__close').addEventListener('click', closeAvatarModal)

document.querySelectorAll('.avatar-modal__option').forEach((btn) => {
  btn.addEventListener('click', () => {
    updateAvatarDisplay(btn.dataset.avatar)
    closeAvatarModal()
  })
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('avatar-modal').classList.contains('avatar-modal--open')) {
    closeAvatarModal()
  }
})

updateAvatarDisplay(initialAvatar)

// Fun facts – available only during break
let currentFactIndex = -1

function showFact() {
  const { fact, index } = getRandomFact(currentFactIndex)
  currentFactIndex = index
  const el = document.getElementById('fun-fact')
  el.textContent = fact
  el.classList.add('fun-fact--animate')
  el.addEventListener('animationend', () => el.classList.remove('fun-fact--animate'), { once: true })
}

function showFactsLockedToast() {
  const toast = document.getElementById('fun-facts-toast')
  toast.textContent = 'Stay focused! Facts unlock during your break 🍵'
  toast.classList.add('fun-facts__toast--visible')
  setTimeout(() => toast.classList.remove('fun-facts__toast--visible'), 2500)
}

const btnNextFact = document.getElementById('btn-next-fact')
btnNextFact.addEventListener('click', (e) => {
  if (timer.getState().currentMode === 'work') {
    e.preventDefault()
    showFactsLockedToast()
  } else {
    showFact()
  }
})

document.querySelector('.fun-facts').addEventListener('click', (e) => {
  if (e.target.closest('button')) return
  if (timer.getState().currentMode === 'work') {
    showFactsLockedToast()
  }
})

showFact()
