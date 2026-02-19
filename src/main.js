import './style.css'
import { createTimer, formatTime } from './timer.js'
import { getRandomFact } from './facts.js'
import { AVATARS } from './avatars.js'

const USERNAME_KEY = 'pomodoro-username'
const AVATAR_KEY = 'pomodoro-avatar'

const MODE_LABELS = {
  work: '🍅 Work',
  break: '☕ Break',
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
      ? 'Time for a break. ☕'
      : 'Ready to focus again? 🍅'
  playCompletionSound()
  showNotification(title, body)
}

const initialUsername = (localStorage.getItem(USERNAME_KEY) || '').replace(/"/g, '&quot;')
const initialAvatar = localStorage.getItem(AVATAR_KEY) || 'tomato'

document.querySelector('#app').innerHTML = `
  <div class="app-wrapper">
    <div class="card">
      <section class="user-profile">
        <div class="user-profile__avatar-section">
          <div id="avatar-display" class="avatar-display" aria-hidden="true">${(AVATARS.find((a) => a.id === initialAvatar) || AVATARS[0]).emoji}</div>
          <div class="avatar-picker" role="group" aria-label="Choose your avatar">
            ${AVATARS.map(
              (a) =>
                `<button type="button" class="avatar-option ${a.id === initialAvatar ? 'avatar-option--selected' : ''}" data-avatar="${a.id}" aria-label="Select ${a.label} avatar" title="${a.label}">${a.emoji}</button>`
            ).join('')}
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
            🍅 Work
          </span>
        </div>
        <div class="pomodoro-timer__display">
          <time id="timer-display" class="timer-display" datetime="PT25M" aria-live="polite">
            25:00
          </time>
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

function updateUI(state) {
  const modeChanged = state.currentMode !== previousMode

  timerDisplay.textContent = formatTime(state.timeRemaining)
  timerDisplay.datetime = formatDuration(state.timeRemaining)
  modeIndicator.textContent = MODE_LABELS[state.currentMode]
  modeIndicator.className = `mode-indicator mode-indicator--${state.currentMode}${modeChanged ? ' mode-indicator--switch' : ''}`
  btnStartPause.textContent = state.isRunning ? 'Pause' : 'Start'
  btnStartPause.setAttribute('aria-pressed', state.isRunning ? 'true' : 'false')

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

function updateAvatarDisplay(avatarId) {
  const avatar = AVATARS.find((a) => a.id === avatarId) || AVATARS[0]
  const display = document.getElementById('avatar-display')
  const options = document.querySelectorAll('.avatar-option')
  display.textContent = avatar.emoji
  display.setAttribute('aria-label', `Your avatar: ${avatar.label}`)
  options.forEach((btn) => {
    btn.classList.toggle('avatar-option--selected', btn.dataset.avatar === avatarId)
  })
  localStorage.setItem(AVATAR_KEY, avatarId)
}

document.querySelectorAll('.avatar-option').forEach((btn) => {
  btn.addEventListener('click', () => updateAvatarDisplay(btn.dataset.avatar))
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
