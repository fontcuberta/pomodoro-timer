const WORK_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60

/**
 * Format seconds as MM:SS
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * Create a Pomodoro timer instance.
 * @returns {{
 *   start: () => void
 *   pause: () => void
 *   toggle: () => void
 *   reset: () => void
 *   onTick: (callback: (state: { timeRemaining: number; isRunning: boolean; currentMode: 'work' | 'break' }) => void) => void
 *   onModeComplete: (callback: (state: { timeRemaining: number; currentMode: 'work' | 'break' }) => void) => void
 *   getState: () => { timeRemaining: number; isRunning: boolean; currentMode: 'work' | 'break' }
 * }}
 */
export function createTimer() {
  let timeRemaining = WORK_DURATION
  let isRunning = false
  let currentMode = 'work'
  let intervalId = null
  let onTickCallback = null
  let onModeCompleteCallback = null

  function getDurationForMode(mode) {
    return mode === 'work' ? WORK_DURATION : BREAK_DURATION
  }

  function tick() {
    if (timeRemaining <= 0) {
      currentMode = currentMode === 'work' ? 'break' : 'work'
      timeRemaining = getDurationForMode(currentMode)
      isRunning = false
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      onModeCompleteCallback?.({ timeRemaining, currentMode })
      onTickCallback?.({ timeRemaining, isRunning, currentMode })
    } else {
      timeRemaining--
    }
    onTickCallback?.({ timeRemaining, isRunning, currentMode })
  }

  function start() {
    if (isRunning) return
    isRunning = true
    onTickCallback?.({ timeRemaining, isRunning, currentMode })
    intervalId = setInterval(tick, 1000)
  }

  function pause() {
    if (!isRunning) return
    isRunning = false
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
    onTickCallback?.({ timeRemaining, isRunning, currentMode })
  }

  function toggle() {
    if (isRunning) {
      pause()
    } else {
      start()
    }
  }

  function reset() {
    pause()
    timeRemaining = getDurationForMode(currentMode)
    onTickCallback?.({ timeRemaining, isRunning, currentMode })
  }

  function onTick(callback) {
    onTickCallback = callback
  }

  function onModeComplete(callback) {
    onModeCompleteCallback = callback
  }

  function getState() {
    return { timeRemaining, isRunning, currentMode }
  }

  return {
    start,
    pause,
    toggle,
    reset,
    onTick,
    onModeComplete,
    getState,
  }
}
