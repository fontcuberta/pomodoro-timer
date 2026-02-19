import './style.css'
import { createTimer, formatTime } from './timer.js'

const THEME_KEY = 'pomodoro-theme'

function getPreferredTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem(THEME_KEY, theme)
  const btn = document.querySelector('#btn-theme')
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
    btn.innerHTML = theme === 'dark' ? '☀️' : '🌙'
  }
}

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

document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank" rel="noopener" class="footer-credit">
      <img src="/vite.svg" class="logo vite" alt="Vite" />
    </a>
    <div class="card">
      <button id="btn-theme" type="button" class="btn-theme" aria-label="Switch to light mode">
        ☀️
      </button>
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
    </div>
    <p class="read-the-docs">
      <a href="https://vite.dev" target="_blank" rel="noopener">Vite</a> + vanilla JavaScript
    </p>
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

document.querySelector('#btn-theme').addEventListener('click', () => {
  const current = getPreferredTheme()
  setTheme(current === 'dark' ? 'light' : 'dark')
})

// Apply saved or system theme
setTheme(getPreferredTheme())

// Initial render
updateUI(timer.getState())
