import './style.css'
import { createTimer, formatTime, WORK_DURATION, BREAK_DURATION } from './timer.js'
import { getRandomFact } from './facts.js'
import { AVATARS, getAvatarUrl } from './avatars.js'

const USERNAME_KEY = 'pomodoro-username'
const AVATAR_KEY = 'pomodoro-avatar'

const MODE_LABELS = {
  work: 'Work',
  break: 'Break',
}

function playCompletionSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
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

// Tomato rain background
const tomatoRain = document.getElementById('tomato-rain')
const TOMATO_COUNT = 24
for (let i = 0; i < TOMATO_COUNT; i++) {
  const t = document.createElement('div')
  t.className = 'tomato-rain__tomato'
  t.style.setProperty('--delay', `${(i / TOMATO_COUNT) * 20}s`)
  t.style.setProperty('--x', `${(i * 7) % 100}%`)
  t.style.setProperty('--size', `${12 + (i % 8)}px`)
  tomatoRain.appendChild(t)
}

document.querySelector('#app').innerHTML = `
  <div class="app-wrapper">
    <div class="card">
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
        </div>
      </main>

      <section class="fun-facts">
        <h2 class="fun-facts__heading">Did you know?</h2>
        <p id="fun-fact" class="fun-fact" aria-live="polite"></p>
        <button id="btn-next-fact" type="button" class="btn btn--ghost">Next fact</button>
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
  return mode === 'work' ? WORK_DURATION : BREAK_DURATION
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
    const slotTotal = state.currentMode === 'work' ? '25:00' : '5:00'
    progressLabel.textContent = `${formatTime(elapsed)} / ${slotTotal}`
    const progressEl = document.querySelector('.slot-progress')
    progressEl.setAttribute('aria-valuenow', Math.round(progressPct))
    progressEl.className = `slot-progress slot-progress--${state.currentMode}`
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

const timer = createTimer()

timer.onTick(updateUI)
timer.onModeComplete(({ currentMode }) => {
  notifyModeComplete(currentMode)
})

btnStartPause.addEventListener('click', () => timer.toggle())
btnReset.addEventListener('click', () => timer.reset())

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

// Fun facts
let currentFactIndex = -1

function showFact() {
  const { fact, index } = getRandomFact(currentFactIndex)
  currentFactIndex = index
  const el = document.getElementById('fun-fact')
  el.textContent = fact
  el.classList.add('fun-fact--animate')
  el.addEventListener('animationend', () => el.classList.remove('fun-fact--animate'), { once: true })
}

document.getElementById('btn-next-fact').addEventListener('click', showFact)
showFact()
