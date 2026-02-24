export const DEFAULT_WORK_DURATION = 25 * 60
export const DEFAULT_BREAK_DURATION = 5 * 60

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
 * @param {{ workDuration?: number; breakDuration?: number }} [options]
 * @returns {{
 *   start: () => void
 *   pause: () => void
 *   toggle: () => void
 *   reset: () => void
 *   setDurations: (work: number, break: number) => void
 *   getDurations: () => { work: number; break: number }
 *   onTick: (callback) => void
 *   onModeComplete: (callback) => void
 *   getState: () => { timeRemaining: number; isRunning: boolean; currentMode: 'work' | 'break' }
 * }}
 */
export function createTimer(options = {}) {
  let workDuration = options.workDuration ?? DEFAULT_WORK_DURATION
  let breakDuration = options.breakDuration ?? DEFAULT_BREAK_DURATION
  let timeRemaining = workDuration
  let isRunning = false
  let currentMode = 'work'
  let intervalId = null
  let onTickCallback = null
  let onModeCompleteCallback = null

  function getDurationForMode(mode) {
    return mode === 'work' ? workDuration : breakDuration
  }

  function setDurations(work, breakDur) {
    workDuration = Math.max(1, work)
    breakDuration = Math.max(1, breakDur)
  }

  function getDurations() {
    return { work: workDuration, break: breakDuration }
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
    setDurations,
    getDurations,
    onTick,
    onModeComplete,
    getState,
  }
}
