import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import level1Src from '../videos/level1.mp4'
import level2Src from '../videos/level2.mp4'
import level3Src from '../videos/level3.mp4'
import level4RedSrc from '../videos/level4red.mp4'
import level4GreenSrc from '../videos/level4green.mp4'
import level5Src from '../videos/level5.mp4'

//hide-button at line 620

export default function LevelPlayer() {
	const navigate = useNavigate()
	const { id } = useParams()

	// Per-level configuration must be defined before using in hooks
	const levelConfig = useMemo(() => ({
		'lvl-1': {
			label: 'Level 1',
			hint: 'Brake Now',
			action: 'brake', // 'brake' | 'stop' | 'turn'
			window: [4.5, 8],
			video: level1Src,
			videoEnd: 10,
			maxSpeed: 200, // km/h (equivalent to 2.0x video speed)
			speedMultiplier: 100, // 1x video speed = 100 km/h
			vibrationStamps: [4.5, 7]
		},
		'lvl-2': {
			label: 'Level 2',
			hint: 'Right indicator & Right turn',
			action: 'turn',
			side: 'right', // 'left' | 'right'
			indicatorWindow: [3, 6],
			turnWindow: [5.5, 9],
			// threshold when a missed turn should be flagged (seconds)
			turnThreshold: 8.3,
			video: level2Src,
			videoEnd: 18,
			maxSpeed: 200, // km/h (equivalent to 2.0x video speed)
			speedMultiplier: 100, // 1x video speed = 100 km/h
			vibrationStamps: [3, 5.5]
		},
		'lvl-3': {
			label: 'Level 3',
			hint: 'Left indicator & Left turn',
			action: 'turn',
			side: 'left',
			indicatorWindow: [8.5, 11],
			turnWindow: [10.5, 12.5],
			// threshold when a missed turn should be flagged (seconds)
			turnThreshold: 12.5,
			video: level3Src,
			videoEnd: 22,
			maxSpeed: 200, // km/h (equivalent to 2.0x video speed)
			speedMultiplier: 100, // 1x video speed = 100 km/h
			vibrationStamps: [8.5, 10.5]
		},
		'lvl-4': {
			label: 'Level 4',
			hint: 'Stop Now',
			action: 'stop',
			window: [1, 4.20], // red signal: must stop between 1-4.20 seconds
			redVideo: level4RedSrc, // red light video
			greenVideo: level4GreenSrc, // green light video (shown after countdown)
			video: level4RedSrc, // starts with red video
			videoEnd: 25, // total duration for both videos combined
			maxSpeed: 200, // km/h (equivalent to 2.0x video speed)
			speedMultiplier: 100, // 1x video speed = 100 km/h
			vibrationStamps: [1]
		},
		'lvl-5': {
			label: 'Level 5',
			hint: 'Maintain Speed Limit',
			action: 'speed_limit', // 'speed_limit'
			speedLimit: 75, // kmph (equivalent to 1.4x video speed)
			speedLimitWindow: [8, 18], // show speed limit indicator at 4s, monitor till 15s
			video: level5Src,
			videoEnd: 18,
			maxSpeed: 100, // km/h (equivalent to 2.0x video speed)
			speedMultiplier: 50, // 1x video speed = 50 km/h (custom for Level 5)
			vibrationStamps: [8]
		},
	}), [])

	// UI configuration (developer can toggle these flags to show/hide components)
	// Available keys and defaults (set to false to hide that component):
	// accelerate: Accelerate button, brake: Brake button
	// leftIndicator: Left indicator button and UI, rightIndicator: Right indicator button and UI
	// turnButtons: Left/Right turn buttons
	// acceleratorBrakeUI: Accelerator/Brake pedal UI, indicatorsUI: Indicators panel, steeringUI: Steering wheel UI
	// speedometer: Digital speed display
	const uiConfig = useMemo(() => ({
		showBack: true,
		accelerate: true,
		brake: true,
		leftIndicator: true,
		rightIndicator: true,
		turnButtons: true,
		acceleratorBrakeUI: false,
		indicatorsUI: false,
		steeringUI: false,
		speedometer: true,
	}), [])

	const cfg = levelConfig[id] || levelConfig['lvl-1']
	const source = cfg.video
	const videoRef = useRef(null)
	const [name, setName] = useState('')
	const holdTimerRef = useRef(null)
	const holdDirectionRef = useRef(null) // 'up' | 'down' | null
	const [targetRate, setTargetRate] = useState(0) // 0x initially (paused)
	const [showHint, setShowHint] = useState(false)
	const [outcome, setOutcome] = useState(null) // 'success' | 'early' | 'late' | 'wrong' | null
	const brakedInWindowRef = useRef(false)
	const evaluatedLateRef = useRef(false)
	const lastActionRef = useRef(null) // 'up' | 'down' | null
	const [indicator, setIndicator] = useState(null) // 'left' | 'right' | null
	const [windowStart, windowEnd] = cfg.window || [0, 0]
	const [indicatorTime, setIndicatorTime] = useState(null)
	const [turnTime, setTurnTime] = useState(null)
	const [turnSide, setTurnSide] = useState(null) // 'left' | 'right' | null
	const turnedWithoutIndicatorRef = useRef(false)
	const successRef = useRef(false)
	const indicatorTimeRef = useRef(null)
	const turnTimeRef = useRef(null)
	const vibrationTriggeredRef = useRef(new Set())
	const [showIndicatorHint, setShowIndicatorHint] = useState(false)
	const [showTurnHint, setShowTurnHint] = useState(false)
	const indicatorWindow = cfg.indicatorWindow || null
	const turnWindow = cfg.turnWindow || null
	const announcedRef = useRef({ indicator: false, turn: false, slow: false })
	const [showSlowHint, setShowSlowHint] = useState(false)
	const slowWindow = cfg.slowAction?.window || null
	const speedLimitWindow = cfg.speedLimitWindow || null

	// Level 5 speed limit tracking
	const [showSpeedLimitIndicator, setShowSpeedLimitIndicator] = useState(false)
	const [speedLimitCrossed, setSpeedLimitCrossed] = useState(false) // for red border
	const [showSpeedLimitBeep, setShowSpeedLimitBeep] = useState(false)
	const speedLimitBeepTimeoutRef = useRef(null)
	const lastBeepTimeRef = useRef(0) // prevent multiple beeps per 500ms
	const speedLimitCrossingRef = useRef(false) // track if already crossed in this session

	// Level 4 traffic signal (red/green light) tracking
	const [currentVideo, setCurrentVideo] = useState(cfg.redVideo || cfg.video) // tracks which video is playing
	const [stoppedAt, setStoppedAt] = useState(null) // timestamp where car stopped
	const [showTrafficCountdown, setShowTrafficCountdown] = useState(false) // show countdown overlay
	const [trafficCountdown, setTrafficCountdown] = useState(5) // countdown value (5 to 0)
	const stoppedInWindowRef = useRef(false) // track if car stopped in the red light window
	const videoSwitchDoneRef = useRef(false) // track if we've already switched to green video

	// If the user turned without indicator, we mark it in a ref so we can
	// show a popup at video end. If the indicator is applied afterwards,
	// clear that flag so no popup is shown.
	useEffect(() => {
		if (indicatorTime != null && turnedWithoutIndicatorRef.current) {
			// If indicator applied after a turn without indicator, clear the flag
			turnedWithoutIndicatorRef.current = false
		}
		// keep refs in sync with state (in case state was updated elsewhere)
		if (indicatorTime !== indicatorTimeRef.current) indicatorTimeRef.current = indicatorTime
		if (turnTime !== turnTimeRef.current) turnTimeRef.current = turnTime
	}, [indicatorTime])

	function speak(text) {
		try {
			const u = new SpeechSynthesisUtterance(text)
			speechSynthesis.cancel()
			speechSynthesis.speak(u)
		} catch { }
	}

	function beep() {
		try {
			const ctx = new (window.AudioContext || window.webkitAudioContext)()
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.connect(gain)
			gain.connect(ctx.destination)
			osc.frequency.value = 800 // Hz
			osc.type = 'sine'
			gain.gain.setValueAtTime(0.3, ctx.currentTime)
			gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
			osc.start(ctx.currentTime)
			osc.stop(ctx.currentTime + 0.1)
		} catch { }
	}

	// Send vibration/haptic signal to first connected gamepad (PXN V9)
	function vibrateGamepad(duration = 200, weakMagnitude = 0.4, strongMagnitude = 0.8) {
		try {
			const gp = navigator.getGamepads && navigator.getGamepads()[0]
			if (!gp) return
			// Some controllers expose `vibrationActuator.playEffect`
			const act = gp.vibrationActuator || gp.hapticActuators?.[0]
			if (act && typeof act.playEffect === 'function') {
				// dual-rumble is widely supported
				act.playEffect('dual-rumble', {
					startDelay: 0,
					duration: Math.max(20, duration),
					weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
					strongMagnitude: Math.min(1, Math.max(0, strongMagnitude))
				}).catch(() => { })
			} else if (navigator.vibrate) {
				// Fallback to navigator.vibrate (affects device vibration only)
				navigator.vibrate(duration)
			}
		} catch { }
	}

	// Announcements for turn levels (indicator/turn)
	useEffect(() => {
		if (cfg.action !== 'turn') return
		if (showIndicatorHint && !announcedRef.current.indicator) {
			announcedRef.current.indicator = true
			speak(cfg.side === 'left' ? 'Turn on left indicator now' : 'Turn on right indicator now')
		}
		if (showTurnHint && !announcedRef.current.turn) {
			announcedRef.current.turn = true
			speak(cfg.side === 'left' ? 'Take left turn now' : 'Take right turn now')
		}
	}, [cfg.action, cfg.side, showIndicatorHint, showTurnHint])

	// Announcement for brake level (Level 1)
	useEffect(() => {
		if (cfg.action !== 'brake') return
		if (showHint && !announcedRef.current.brake) {
			announcedRef.current.brake = true
			speak('Brake now')
		}
	}, [cfg.action, showHint])

	// Announcement for stop level (Level 4)
	useEffect(() => {
		if (cfg.action !== 'stop') return
		if (showHint && !announcedRef.current.stop) {
			announcedRef.current.stop = true
			speak('Stop now')
		}
	}, [cfg.action, showHint])

	// Announcement for slow action (Level 4 slow down)
	useEffect(() => {
		if (!cfg.slowAction) return
		if (showSlowHint && !announcedRef.current.slow) {
			announcedRef.current.slow = true
			speak('Slow down')
		}
	}, [cfg.slowAction, showSlowHint])

	// Announcement for speed limit (Level 5)
	useEffect(() => {
		if (cfg.action !== 'speed_limit') return
		if (showSpeedLimitIndicator && !announcedRef.current.speedLimit) {
			announcedRef.current.speedLimit = true
			speak(`Speed limit is ${cfg.speedLimit} kilometers per hour`)
		}
	}, [cfg.action, cfg.speedLimit, showSpeedLimitIndicator])

	useEffect(() => {
		const saved = localStorage.getItem('userName')
		if (!saved) {
			navigate('/', { replace: true })
			return
		}
		setName(saved)
	}, [navigate])

	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		// 🔥 Android TV / WebView permission flags
		video.muted = false
		video.autoplay = true      // permission only
		video.playsInline = true
		video.preload = "auto"

		// 🚗 GAME LOGIC
		if (targetRate <= 0) {
			video.pause()            // car is stopped
			return
		}

		video.playbackRate = Math.min(Math.max(targetRate, 0.1), 2)

		const playPromise = video.play()
		if (playPromise) {
			playPromise.catch(() => { })
		}
	}, [targetRate])



	function nudgeRate(delta) {
		setTargetRate(prev => {
			const next = Math.max(0, Math.min(2, +(prev + delta).toFixed(2)))
			return next
		})
	}

	function startHold(direction) {
		lastActionRef.current = direction
		holdDirectionRef.current = direction
		if (holdTimerRef.current) return
		holdTimerRef.current = setInterval(() => {
			if (holdDirectionRef.current === 'up') nudgeRate(0.1)
			else if (holdDirectionRef.current === 'down') nudgeRate(-0.1)
		}, 150)
	}

	function endHold() {
		holdDirectionRef.current = null
		if (holdTimerRef.current) {
			clearInterval(holdTimerRef.current)
			holdTimerRef.current = null
		}
	}

	useEffect(() => () => endHold(), [])

	// Timing window hint and ended outcome
	useEffect(() => {
		const video = videoRef.current
		if (!video) return
		function onTimeUpdate() {
			const t = video.currentTime || 0

			// Per-level vibration stamps: trigger once when we cross each timestamp
			if (cfg.vibrationStamps && Array.isArray(cfg.vibrationStamps)) {
				for (const stamp of cfg.vibrationStamps) {
					// if not yet triggered and we've reached or passed the stamp
					if (!vibrationTriggeredRef.current.has(stamp) && t >= stamp) {
						vibrateGamepad(200, 0.35, 0.8)
						vibrationTriggeredRef.current.add(stamp)
					}
				}
			}
			if (cfg.action === 'turn') {
				setShowIndicatorHint(Boolean(indicatorWindow && t >= indicatorWindow[0] && t < indicatorWindow[1]))
				setShowTurnHint(Boolean(turnWindow && t >= turnWindow[0] && t < turnWindow[1]))
				// If the configured threshold has passed and user did not take the turn, mark as not turned
				const threshold = cfg.turnThreshold ?? (turnWindow ? turnWindow[1] : null)
				if (threshold != null && t >= threshold && turnTimeRef.current == null && outcome == null) {
					// Only show the combined indicator+not-turned message once the indicator window
					// has closed (so we don't show it in the middle of the indicator window).
					const indicatorWindowClosed = !indicatorWindow || t >= indicatorWindow[1]
					// If indicator wasn't applied, treat as a missed turn (do not show combined popup)
					setOutcome('not_turned')
				}
			} else if (cfg.action === 'speed_limit') {
				// Get speed limit window
				const [speedLimitStart, speedLimitEnd] = cfg.speedLimitWindow || [0, 0]

				// Show speed limit indicator starting at speedLimitStart (at 4 seconds)
				setShowSpeedLimitIndicator(t >= speedLimitStart)

				// Check if speed exceeds the limit (convert speedLimit kmph to video speed multiplier)
				// Formula: speed limit (km/h) ÷ speedMultiplier = video speed multiplier
				// e.g., Level 5: 70 km/h ÷ 50 = 1.4x video speed
				const speedLimitMultiplier = cfg.speedLimit / cfg.speedMultiplier
				const isSpeedExceeded = targetRate > speedLimitMultiplier

				// Show speed limit crossed during the monitoring window (4-15s)
				if (isSpeedExceeded && t >= speedLimitStart && t <= speedLimitEnd) {
					setSpeedLimitCrossed(true)
					// Mark speed limit as crossed for the session
					if (!speedLimitCrossingRef.current) {
						speedLimitCrossingRef.current = true
					}
				} else {
					setSpeedLimitCrossed(false)
				}

				// Beep continuously while speed exceeded (every 500ms) during window
				if (isSpeedExceeded && t >= speedLimitStart && t <= speedLimitEnd) {
					const now = Date.now()
					if (now - lastBeepTimeRef.current > 500) { // beep every 500ms while speed is exceeded
						lastBeepTimeRef.current = now
						beep()
						setShowSpeedLimitBeep(true)
						if (speedLimitBeepTimeoutRef.current) clearTimeout(speedLimitBeepTimeoutRef.current)
						speedLimitBeepTimeoutRef.current = setTimeout(() => setShowSpeedLimitBeep(false), 300)
					}
				} else if (!isSpeedExceeded) {
					// Reset beep timing when speed returns to normal
					lastBeepTimeRef.current = 0
				}
			} else {
				setShowHint(t >= windowStart && t < windowEnd)
			}
			// Show slow hint if slowWindow is configured
			if (slowWindow) {
				setShowSlowHint(t >= slowWindow[0] && t < slowWindow[1])
			}
		}
		function onEnded() {
			// For turn levels: if user turned without indicator earlier, show that outcome now
			if (cfg.action === 'turn') {
				if (turnedWithoutIndicatorRef.current && outcome == null) {
					setOutcome('no_indicator')
					return
				}
			}
			// If level was successful earlier, show success at end of video
			if (successRef.current && outcome == null) {
				setOutcome('success')
				return
			}
			// For Level 4: if moved without stopping in red light window, show jumped red signal
			if (cfg.action === 'stop' && movedInStopWindowRef.current && outcome == null) {
				setOutcome('jumped_red_signal')
				return
			}
			// For Level 4 traffic signal: if car stopped in the window and green video finished, show success
			if (cfg.action === 'stop' && stoppedInWindowRef.current && currentVideo === cfg.greenVideo && outcome == null) {
				setOutcome('success')
				return
			}
			// For Level 5: Check if speed limit was crossed during the window
			if (cfg.action === 'speed_limit' && outcome == null) {
				if (speedLimitCrossingRef.current) {
					// User exceeded speed limit - mark as overspeed failure
					setOutcome('overspeed')
					return
				}
				// No overspeed - success
				setOutcome('success')
				return
			}
			if (!brakedInWindowRef.current && outcome == null) setOutcome('late')
		}
		video.addEventListener('timeupdate', onTimeUpdate)
		video.addEventListener('ended', onEnded)
		return () => {
			video.removeEventListener('timeupdate', onTimeUpdate)
			video.removeEventListener('ended', onEnded)
		}
	}, [id, windowStart, windowEnd, cfg.action, indicatorWindow, turnWindow, outcome, slowWindow, speedLimitWindow, targetRate, cfg])

	useEffect(() => {
		const video = videoRef.current
		if (!video) return
		if (cfg.action === 'brake' || cfg.action === 'stop') {
			if (targetRate === 0 && lastActionRef.current === 'down') {
				const t = video.currentTime || 0
				if (t < windowStart) setOutcome('early')
				else if (t <= windowEnd) {
					brakedInWindowRef.current = true
					successRef.current = true
					// For Level 4 (traffic signal) - new implementation with video switching
					if (cfg.action === 'stop' && cfg.greenVideo && !stoppedInWindowRef.current) {
						stoppedInWindowRef.current = true
						setStoppedAt(t) // Save the timestamp where car stopped
						setShowTrafficCountdown(true) // Start countdown
						setTrafficCountdown(5) // 5 second countdown
					}
					// Old Level 4 red light countdown (with skipToFrame)
					else if (cfg.action === 'stop' && cfg.skipToFrame != null && !redLightStoppedRef.current) {
						redLightStoppedRef.current = true
						setShowRedLightCountdown(true)
						setRedLightCountdown(5)
					}
					// For regular brake action, show success immediately
					else if (cfg.action === 'brake') {
						setOutcome('success')
					}
				}
				else setOutcome('late')
			}
			// Track if vehicle moved in stop window (for jumped red signal detection)
			if (cfg.action === 'stop') {
				const t = video.currentTime || 0
				if (t >= windowStart && t <= windowEnd && targetRate > 0) {
					movedInStopWindowRef.current = true
				}
			}
		} else if (cfg.action === 'turn') {
			// If user turned but did not apply indicator -> mark it and let the video continue;
			// we'll show the 'no_indicator' popup at video end instead of pausing immediately.
			if (turnTimeRef.current != null && indicatorTimeRef.current == null && outcome == null) {
				turnedWithoutIndicatorRef.current = true
				return
			}
			// Wrong turn clicked at any time -> immediate failure
			if (turnSide && cfg.side && turnSide !== cfg.side && outcome == null) {
				setOutcome('wrong')
				return
			}
			// Wrong indicator applied -> immediate failure
			if (indicator && cfg.side && indicator !== cfg.side && outcome == null) {
				setOutcome('wrong')
				return
			}
			// Evaluate when both actions taken
			const iTime = indicatorTimeRef.current
			const rTime = turnTimeRef.current
			if (iTime != null && rTime != null && outcome == null) {
				const indicatorTooEarly = iTime < indicatorWindow[0]
				const turnTooEarly = rTime < turnWindow[0]
				const indicatorTooLate = iTime > indicatorWindow[1]
				const turnTooLate = rTime > turnWindow[1]

				const indicatorInWindow = iTime >= indicatorWindow[0] && iTime <= indicatorWindow[1]
				const turnInWindow = rTime >= turnWindow[0] && rTime <= turnWindow[1]

				// Both actions are within their windows -> SUCCESS
				if (indicatorInWindow && turnInWindow) {
					brakedInWindowRef.current = true
					successRef.current = true // defer success until video end
				}
				// Check if either action is too early
				else if (indicatorTooEarly || turnTooEarly) {
					setOutcome('early')
				}
				// Check if either action is too late
				else if (indicatorTooLate || turnTooLate) {
					setOutcome('late')
				}
			}
		}
	}, [id, targetRate, turnSide, cfg.action, cfg.side, windowStart, windowEnd, indicatorWindow, turnWindow, outcome])

	// Auto-mark level completed for current user when success
	useEffect(() => {
		if (outcome !== 'success' || !name || !id) return
		try {
			const key = `userLevels:${name}`
			const raw = localStorage.getItem(key)
			let data = []
			if (raw) {
				try { data = JSON.parse(raw) || [] } catch { data = [] }
			}
			let found = false
			const next = data.map((item) => {
				if (item && item.id === id) { found = true; return { ...item, completed: true } }
				return item
			})
			if (!found) next.push({ id, completed: true })
			localStorage.setItem(key, JSON.stringify(next))
		} catch { }
	}, [outcome, name, id])

	// Pause video immediately when any outcome (failure/success/timeout) is set
	useEffect(() => {
		if (!outcome) return
		const video = videoRef.current
		if (video) {
			video.pause()
		}
		setTargetRate(0)
	}, [outcome])

	function resetAndRetry() {
		const video = videoRef.current
		if (video) {
			video.pause()
			video.currentTime = 0
			video.playbackRate = 1
			// For Level 4 traffic signal, reset to red video
			if (cfg.action === 'stop' && cfg.redVideo) {
				video.src = cfg.redVideo
			}
		}
		brakedInWindowRef.current = false
		lastActionRef.current = null
		setTargetRate(0)
		setOutcome(null)
		setIndicator(null)
		setIndicatorTime(null)
		setTurnTime(null)
		setTurnSide(null)
		turnedWithoutIndicatorRef.current = false
		successRef.current = false
		announcedRef.current = { indicator: false, turn: false, slow: false, speedLimit: false }
		// Reset red light state
		setShowRedLightCountdown(false)
		setRedLightCountdown(5)
		redLightStoppedRef.current = false
		movedInStopWindowRef.current = false
		// Reset traffic signal state (Level 4 new)
		setCurrentVideo(cfg.redVideo || cfg.video)
		setStoppedAt(null)
		setShowTrafficCountdown(false)
		setTrafficCountdown(5)
		stoppedInWindowRef.current = false
		videoSwitchDoneRef.current = false
		// Reset speed limit state
		setShowSpeedLimitIndicator(false)
		setSpeedLimitCrossed(false)
		setShowSpeedLimitBeep(false)
		if (speedLimitBeepTimeoutRef.current) clearTimeout(speedLimitBeepTimeoutRef.current)
		lastBeepTimeRef.current = 0
		speedLimitCrossingRef.current = false
		// reset vibration stamp triggers
		vibrationTriggeredRef.current = new Set()
	}

	// 🎮 PXN V9 INTEGRATION - Enhanced with proper state management
	const [gamepadConnected, setGamepadConnected] = useState(false)
	// show short-lived toast when gamepad connects
	const [showGamepadToast, setShowGamepadToast] = useState(false)
	const [showControls, setShowControls] = useState(true) // show by default per request
	const [gamepadState, setGamepadState] = useState({
		steering: 0, // -1 to 1
		accelerator: 0, // 0 to 1
		brake: 0, // 0 to 1
		leftIndicator: false,
		rightIndicator: false
	})
	const [buttonPressed, setButtonPressed] = useState({
		accelerator: false,
		brake: false,
		leftIndicator: false,
		rightIndicator: false
	})
	// Refs to keep track of current state for use in gamepad handler closures
	const buttonPressedRef = useRef(buttonPressed)
	const indicatorRef = useRef(indicator)

	// Keep refs in sync with state
	useEffect(() => {
		buttonPressedRef.current = buttonPressed
	}, [buttonPressed])

	useEffect(() => {
		indicatorRef.current = indicator
	}, [indicator])

	const [steeringWarning, setSteeringWarning] = useState(false)
	const [turnWarning, setTurnWarning] = useState(false)
	const [showCountdown, setShowCountdown] = useState(false)
	const [countdown, setCountdown] = useState(3)
	const [speedAlert, setSpeedAlert] = useState(false)
	const lastSpeedRef = useRef(0)
	const lastTurnRef = useRef(null) // 'left' | 'right'
	// Level 4 red light stop tracking
	const [showRedLightCountdown, setShowRedLightCountdown] = useState(false)
	const [redLightCountdown, setRedLightCountdown] = useState(5)
	const redLightStoppedRef = useRef(false) // track if we've already triggered red light stop
	const movedInStopWindowRef = useRef(false) // track if vehicle moved without stopping

	// Pause video when steering warning pops up
	useEffect(() => {
		if (steeringWarning || turnWarning) {
			const video = videoRef.current
			if (video) {
				lastSpeedRef.current = targetRate // Save last speed
				setTargetRate(0) // Pause video
			}
		}
	}, [steeringWarning, turnWarning])

	// Handle "Continue" after steering/turn warning
	function handleWarningContinue() {
		setSteeringWarning(false)
		setTurnWarning(false)
		setShowCountdown(true)
		setCountdown(3)
	}

	// Countdown logic
	useEffect(() => {
		let timer
		if (showCountdown && countdown > 0) {
			timer = setTimeout(() => setCountdown(c => c - 1), 1000)
		} else if (showCountdown && countdown === 0) {
			setShowCountdown(false)
			setSpeedAlert(true)
			setTimeout(() => {
				setSpeedAlert(false)
				setTargetRate(lastSpeedRef.current) // Resume video at last speed
			}, 2000)
		}
		return () => clearTimeout(timer)
	}, [showCountdown, countdown])

	// Red light countdown logic (Level 4)
	useEffect(() => {
		let timer
		if (showRedLightCountdown && redLightCountdown > 0) {
			timer = setTimeout(() => setRedLightCountdown(c => c - 1), 1000)
		} else if (showRedLightCountdown && redLightCountdown === 0) {
			// skip to frame and pause
			setShowRedLightCountdown(false)
			const video = videoRef.current
			if (video && cfg.skipToFrame != null) {
				video.currentTime = cfg.skipToFrame
				video.pause()
				setTargetRate(0) // ensure paused
			}
		}
		return () => clearTimeout(timer)
	}, [showRedLightCountdown, redLightCountdown, cfg])

	// Traffic signal countdown logic (Level 4 - new implementation)
	useEffect(() => {
		let timer
		if (cfg.action === 'stop' && showTrafficCountdown && trafficCountdown > 0) {
			timer = setTimeout(() => setTrafficCountdown(c => c - 1), 1000)
		} else if (cfg.action === 'stop' && showTrafficCountdown && trafficCountdown === 0) {
			// Countdown finished - switch to green video at same timestamp
			const video = videoRef.current
			if (video && cfg.greenVideo && stoppedAt != null && !videoSwitchDoneRef.current) {
				videoSwitchDoneRef.current = true
				setCurrentVideo(cfg.greenVideo)
				// Reset the video to the green one and set to stopped timestamp
				video.src = cfg.greenVideo
				video.currentTime = stoppedAt
				video.pause()
				setTargetRate(0) // Start paused at the timestamp
				setShowTrafficCountdown(false)
			}
		}
		return () => clearTimeout(timer)
	}, [cfg.action, showTrafficCountdown, trafficCountdown, cfg.greenVideo, stoppedAt])

	useEffect(() => {
		let interval
		const pollGamepad = () => {
			const gp = navigator.getGamepads()[0]
			if (!gp) return

			// Update gamepad state
			const newState = {
				steering: gp.axes[0] || 0,
				accelerator: gp.buttons[7]?.value || 0,
				brake: gp.buttons[6]?.value || 0,
				leftIndicator: gp.buttons[1]?.pressed || false,
				rightIndicator: gp.buttons[3]?.pressed || false
			}
			setGamepadState(newState)

			// Handle accelerator with continuous input
			if (newState.accelerator > 0.1) {
				lastActionRef.current = 'up'
				nudgeRate(0.1 * newState.accelerator)
			}

			// Handle brake with continuous input
			if (newState.brake > 0.1) {
				lastActionRef.current = 'down'
				nudgeRate(-0.1 * newState.brake)
			}

			// Handle indicators with toggle logic (prevent rapid toggling)
			if (newState.leftIndicator && !buttonPressedRef.current.leftIndicator) {
				setButtonPressed(prev => ({ ...prev, leftIndicator: true }))
				setIndicator(indicatorRef.current === 'left' ? null : 'left')
				const itLeft = indicatorRef.current === 'left' ? null : (videoRef.current?.currentTime || 0)
				setIndicatorTime(itLeft)
				indicatorTimeRef.current = itLeft
			} else if (!newState.leftIndicator && buttonPressedRef.current.leftIndicator) {
				setButtonPressed(prev => ({ ...prev, leftIndicator: false }))
			}

			if (newState.rightIndicator && !buttonPressedRef.current.rightIndicator) {
				setButtonPressed(prev => ({ ...prev, rightIndicator: true }))
				setIndicator(indicatorRef.current === 'right' ? null : 'right')
				const itRight = indicatorRef.current === 'right' ? null : (videoRef.current?.currentTime || 0)
				setIndicatorTime(itRight)
				indicatorTimeRef.current = itRight
			} else if (!newState.rightIndicator && buttonPressedRef.current.rightIndicator) {
				setButtonPressed(prev => ({ ...prev, rightIndicator: false }))
			}

			// Handle steering with threshold
			if (newState.steering < -0.3) {
				// Check if steering is allowed for this level
				if ((cfg.action === 'brake' || cfg.action === 'stop' || cfg.action === 'speed_limit') && !steeringWarning) {
					setSteeringWarning(true)
					return // Stop processing other inputs
				}
				setTurnSide('left')
				const ttLeft = videoRef.current?.currentTime || 0
				setTurnTime(ttLeft)
				turnTimeRef.current = ttLeft
			} else if (newState.steering > 0.3) {
				// Check if steering is allowed for this level
				if ((cfg.action === 'brake' || cfg.action === 'stop' || cfg.action === 'speed_limit') && !steeringWarning) {
					setSteeringWarning(true)
					return // Stop processing other inputs
				}
				setTurnSide('right')
				const ttRight = videoRef.current?.currentTime || 0
				setTurnTime(ttRight)
				turnTimeRef.current = ttRight
			}
		}

		const connectHandler = () => {
			console.log('✅ PXN V9 Connected')
			setGamepadConnected(true)
			// show toast briefly
			setShowGamepadToast(true)
			setTimeout(() => setShowGamepadToast(false), 5000)
			interval = setInterval(pollGamepad, 50) // More responsive polling
		}
		const disconnectHandler = () => {
			console.log('❌ PXN V9 Disconnected')
			setGamepadConnected(false)
			clearInterval(interval)
		}

		// Check if gamepad is already connected
		if (navigator.getGamepads()[0]) {
			connectHandler()
		}

		window.addEventListener('gamepadconnected', connectHandler)
		window.addEventListener('gamepaddisconnected', disconnectHandler)

		return () => {
			window.removeEventListener('gamepadconnected', connectHandler)
			window.removeEventListener('gamepaddisconnected', disconnectHandler)
			clearInterval(interval)
		}
	}, [cfg.action, cfg.side, steeringWarning, turnWarning]) // Only depend on config and warning states, not on frequently-changing UI states

	// Clear vibration triggers when switching levels
	useEffect(() => {
		vibrationTriggeredRef.current = new Set()
	}, [id])

	// Haptics: send vibration to controller when certain alerts/popups occur
	const lastHapticRef = useRef({ outcome: null, turnWarning: false, steeringWarning: false, showCountdown: false, showRedLightCountdown: false, showTrafficCountdown: false, speedAlert: false })
	useEffect(() => {
		// outcome-based vibration
		if (outcome && lastHapticRef.current.outcome !== outcome) {
			if (outcome === 'success') vibrateGamepad(500, 0.2, 0.6)
			else vibrateGamepad(800, 0.7, 1.0)
		}
		// warnings and countdowns
		if (turnWarning && !lastHapticRef.current.turnWarning) vibrateGamepad(420, 0.5, 0.9)
		if (steeringWarning && !lastHapticRef.current.steeringWarning) vibrateGamepad(420, 0.5, 0.9)
		if (showCountdown && !lastHapticRef.current.showCountdown) vibrateGamepad(240, 0.3, 0.6)
		if (showRedLightCountdown && !lastHapticRef.current.showRedLightCountdown) vibrateGamepad(240, 0.4, 0.7)
		if (showTrafficCountdown && !lastHapticRef.current.showTrafficCountdown) vibrateGamepad(240, 0.4, 0.7)
		if (speedAlert && !lastHapticRef.current.speedAlert) vibrateGamepad(300, 0.5, 0.8)

		lastHapticRef.current = { outcome, turnWarning, steeringWarning, showCountdown, showRedLightCountdown, showTrafficCountdown, speedAlert }
	}, [outcome, turnWarning, steeringWarning, showCountdown, showRedLightCountdown, showTrafficCountdown, speedAlert])

	return (
		<div className="video-screen">
			<video
				ref={videoRef}
				className="video-el"
				src={source}
				muted
				playsInline
				preload="auto"
			/>


			{/* Gamepad Connection Status (short toast) */}
			{showGamepadToast && (
				<div className="gamepad-status">
					🎮 PXN V9 Connected
				</div>
			)}

			{/* Driving Controls UI */}
			<div className="driving-controls-ui">
				{/* Steering Wheel */}
				{uiConfig.steeringUI && (
					<div className="control-group steering-group">
						<div className="control-label">Steering</div>
						<div className="steering-wheel">
							<div
								className="steering-indicator"
								style={{
									transform: `rotate(${gamepadState.steering * 90}deg)`,
									opacity: Math.abs(gamepadState.steering) > 0.1 ? 1 : 0.3
								}}
							>
								//put image of steering wheel here
								<img src="/steering-wheel.png" alt="Steering Wheel" />
							</div>
							<div className="steering-value">
								{gamepadState.steering > 0.15 ? 'Right' :
									gamepadState.steering < -0.15 ? 'Left' : 'Center'}
							</div>
						</div>
					</div>
				)}

				{/* Accelerator & Brake */}
				{uiConfig.acceleratorBrakeUI && (
					<div className="control-group pedals-group">
						<div className="pedal-container">
							<div className="control-label">Accelerator</div>
							<div className="pedal accelerator-pedal">
								<div
									className="pedal-fill"
									style={{
										height: `${gamepadState.accelerator * 100}%`,
										backgroundColor: `hsl(${120 - gamepadState.accelerator * 40}, 70%, 50%)`
									}}
								/>
								<div className="pedal-value">
									{Math.round(gamepadState.accelerator * 100)}%
								</div>
							</div>
						</div>

						<div className="pedal-container">
							<div className="control-label">Brake</div>
							<div className="pedal brake-pedal">
								<div
									className="pedal-fill"
									style={{
										height: `${gamepadState.brake * 100}%`,
										backgroundColor: `hsl(${0 + gamepadState.brake * 20}, 70%, 50%)`
									}}
								/>
								<div className="pedal-value">
									{Math.round(gamepadState.brake * 100)}%
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Indicators */}
				{uiConfig.indicatorsUI && (
					<div className="control-group indicators-group">
						<div className="control-label">Indicators</div>
						<div className="indicators-container">
							<div className={`indicator left-indicator ${indicator === 'left' ? 'active' : ''}`}>
								<div className="indicator-arrow">←</div>
								<div className="indicator-label">Left</div>
							</div>
							<div className={`indicator right-indicator ${indicator === 'right' ? 'active' : ''}`}>
								<div className="indicator-arrow">→</div>
								<div className="indicator-label">Right</div>
							</div>
						</div>
					</div>
				)}

				{/* Speedometer */}
				{uiConfig.speedometer && (
					<div className="control-group speedometer-group">
						<div className="control-label">Speed</div>
						<div className="speedometer-container">
							<div className="digital-speed">
								<div className="speed-value">{Math.round(targetRate * cfg.speedMultiplier)} km/h</div>
								<div className="speed-unit">{targetRate.toFixed(2)}x Video</div>
							</div>
						</div>
					</div>
				)}


				{/* Indicator side shading overlays - always show when indicator is active, regardless of uiConfig */}
				{indicator === 'left' && (
					<div className="indicator-shade left on" aria-hidden />
				)}
				{indicator === 'right' && (
					<div className="indicator-shade right on" aria-hidden />
				)}
			</div>			{cfg.action !== 'turn' && showHint && (
				<div className="video-hint">{cfg.hint}</div>
			)}
			{cfg.action === 'turn' && showIndicatorHint && (
				<div className="video-hint">{cfg.side === 'left' ? 'Left indicator' : 'Right indicator'}</div>
			)}
			{cfg.action === 'turn' && showTurnHint && (
				<div className="video-hint">{cfg.side === 'left' ? 'Left turn' : 'Right turn'}</div>
			)}
			{showSlowHint && cfg.slowAction && (
				<div className="video-hint">{cfg.slowAction.hint}</div>
			)}
			{/* Speed limit indicator (Level 5) - Road sign style with gradient */}
			{showSpeedLimitIndicator && cfg.action === 'speed_limit' && (
				<div style={{
					position: 'fixed',
					top: '20px',
					right: '20px',
					width: '80px',
					height: '100px',
					background: 'linear-gradient(135deg, #FFE5E5 0%, #FFC0C0 100%)',
					borderRadius: '8px',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
					zIndex: 100,
				}}>
					<div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000' }}>Speed</div>
					<div style={{ fontSize: '28px', fontWeight: 'bold', color: '#E74C3C' }}>{cfg.speedLimit}</div>
					<div style={{ fontSize: '10px', color: '#000' }}>km/h</div>
				</div>
			)}
			{/* Speed limit crossed indicator (Level 5) */}
			{speedLimitCrossed && cfg.action === 'speed_limit' && (
				<div className="video-hint" style={{ backgroundColor: '#FF0000', color: 'white', animation: 'indicator-pulse 0.3s' }}>
					⚠️ SPEED LIMIT EXCEEDED! Slow Down Now!
				</div>
			)}
			{/* Red border when speed limit crossed */}
			{speedLimitCrossed && cfg.action === 'speed_limit' && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						border: '8px solid rgba(255, 0, 0, 0.4)',
						pointerEvents: 'none',
						zIndex: 999,
						boxShadow: 'inset 0 0 40px rgba(255, 0, 0, 0.2)',
					}}
					aria-hidden
				/>
			)}
			<div className={`video-controls ${showControls ? '' : 'hidden'}`}>
				<div className="row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
					<div className="subtle">
						{cfg.label} • {name}
						{(cfg.action === 'brake' || cfg.action === 'stop') ? `(Speed: ${targetRate.toFixed(2)}x)` : ''}
						{cfg.action === 'speed_limit' ? `(Speed: ${Math.round(targetRate * cfg.speedMultiplier)} km/h, Limit: ${cfg.speedLimit} km/h)` : ''}
					</div>
					<div className="row">
						{uiConfig.showBack && (
							<button className="btn-secondary" onClick={() => navigate(-2)}>Back</button>
						)}
						<button className="btn-secondary" onClick={() => setShowControls(s => !s)} style={{ marginLeft: 8 }}>{showControls ? 'Hide controls' : 'Show controls'}</button>
						{showControls && (
							<>
								{/* Accelerate/Brake always available - uiConfig only controls visibility */}
								<button
									className="btn"
									style={{ display: uiConfig.accelerate ? 'block' : 'none' }}
									onMouseDown={() => startHold('up')}
									onMouseUp={endHold}
									onMouseLeave={endHold}
									onTouchStart={(e) => { e.preventDefault(); startHold('up') }}
									onTouchEnd={endHold}
									onClick={() => { lastActionRef.current = 'up'; nudgeRate(0.25) }}
								>
									Accelerate
								</button>
								<button
									className="btn"
									style={{ display: uiConfig.brake ? 'block' : 'none' }}
									onMouseDown={() => startHold('down')}
									onMouseUp={endHold}
									onMouseLeave={endHold}
									onTouchStart={(e) => { e.preventDefault(); startHold('down') }}
									onTouchEnd={endHold}
									onClick={() => { lastActionRef.current = 'down'; nudgeRate(-0.25) }}
								>
									Brake
								</button>
								{/* Indicator buttons (available on all levels) - uiConfig only controls visibility */}
								<button
									className={`btn-indicator ${indicator === 'left' ? 'active' : ''}`}
									style={{ display: uiConfig.leftIndicator ? 'block' : 'none' }}
									onClick={() => {
										const it = indicator === 'left' ? null : (videoRef.current?.currentTime || 0);
										setIndicator(indicator === 'left' ? null : 'left');
										setIndicatorTime(it);
										indicatorTimeRef.current = it;
										vibrateGamepad(160, 0.25, 0.6);
									}}
								>
									<span className="arrow">&lt;</span> Left Indicator
								</button>
								<button
									className={`btn-indicator ${indicator === 'right' ? 'active' : ''}`}
									style={{ display: uiConfig.rightIndicator ? 'block' : 'none' }}
									onClick={() => {
										const it = indicator === 'right' ? null : (videoRef.current?.currentTime || 0);
										setIndicator(indicator === 'right' ? null : 'right');
										setIndicatorTime(it);
										indicatorTimeRef.current = it;
										vibrateGamepad(160, 0.25, 0.6);
									}}
								>
									Right Indicator <span className="arrow">&gt;</span>
								</button>
								{/* Turn buttons (available on all levels; validated only for turn levels) - uiConfig only controls visibility */}
								<button
									className="btn"
									style={{ display: uiConfig.turnButtons ? 'block' : 'none' }}
									onClick={() => {
										if ((cfg.action === 'brake' || cfg.action === 'stop') && !steeringWarning) {
											setSteeringWarning(true)
											return
										}
										if (cfg.action === 'turn' && cfg.side === 'right' && !turnWarning) {
											// Only right turn allowed
											if ('left' !== cfg.side) {
												setTurnWarning(true)
												lastTurnRef.current = 'left'
												return
											}
										}
										setTurnSide('left');
										const tt = videoRef.current?.currentTime || 0; setTurnTime(tt); turnTimeRef.current = tt
									}}
								>
									Left turn
								</button>
								<button
									className="btn"
									style={{ display: uiConfig.turnButtons ? 'block' : 'none' }}
									onClick={() => {
										if ((cfg.action === 'brake' || cfg.action === 'stop') && !steeringWarning) {
											setSteeringWarning(true)
											return
										}
										if (cfg.action === 'turn' && cfg.side === 'left' && !turnWarning) {
											// Only left turn allowed
											if ('right' !== cfg.side) {
												setTurnWarning(true)
												lastTurnRef.current = 'right'
												return
											}
										}
										setTurnSide('right');
										const tt2 = videoRef.current?.currentTime || 0; setTurnTime(tt2); turnTimeRef.current = tt2
									}}
								>
									Right turn
								</button>
							</>
						)}
					</div>
				</div>
			</div>
			{outcome && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className={`modal card ${outcome === 'success' ? '' : 'error'}`} style={{ textAlign: 'center' }}>
						{outcome !== 'success' && (
							<div className="modal-emoji" aria-hidden>⚠️</div>
						)}
						{outcome === 'success' && (
							<>
								<div className="confetti" aria-hidden>
									{Array.from({ length: 20 }).map((_, i) => (
										<span key={i} />
									))}
								</div>
								<h3 className="heading-xl" style={{ fontSize: 24 }}>Level Completed</h3>
								<p className="subtle">You braked in time. You are aware of obstacles on road.</p>
								<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
									<button className="btn" onClick={() => navigate('/dashboard')}>Go to dashboard</button>
								</div>
							</>
						)}
						{outcome === 'early' && (
							<>
								<h3 className="heading-xl" style={{ fontSize: 24 }}>Early</h3>
								<p className="subtle">
									{cfg.action === 'turn'
										? `You applied the indicator or took the turn before the correct time window. Try again.`
										: `You acted before the hint window. Try again.`}
								</p>
								<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
									<button className="btn" onClick={resetAndRetry}>Retry</button>
								</div>
							</>
						)}
						{outcome === 'late' && (
							<>
								<h3 className="heading-xl" style={{ fontSize: 24 }}>Late</h3>
								<p className="subtle">
									{cfg.action === 'turn'
										? `You applied the indicator or took the turn after the correct time window. Try again.`
										: `You missed the valid window. Try again.`}
								</p>
								<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
									<button className="btn" onClick={resetAndRetry}>Retry</button>
								</div>
							</>
						)}
						{outcome === 'wrong' && (
							<>
								<h3 className="heading-xl" style={{ fontSize: 24 }}>Wrong Action</h3>
								<p className="subtle">Failed: You given opposite indicator or turn. Try again.</p>
								<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
									<button className="btn" onClick={resetAndRetry}>Retry</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
			{/* Additional custom turn/indicator outcomes */}
			{outcome === 'not_turned' && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<div className="confetti" aria-hidden style={{ display: 'none' }} />
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Not turned in time</h3>
						<p className="subtle">You did not take the required {cfg.side === 'left' ? 'left' : 'right'} turn in time. The video has been paused.</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
							<button className="btn" onClick={resetAndRetry}>Retry</button>
						</div>
					</div>
				</div>
			)}
			{outcome === 'no_indicator' && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Indicator not turned on in time</h3>
						<p className="subtle">You turned but did not switch on the indicator. Please ensure indicator is applied before turning.</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
							<button className="btn" onClick={resetAndRetry}>Retry</button>
						</div>
					</div>
				</div>
			)}
			{outcome === 'indicator_not_applied_and_not_turned' && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Indicator not applied & not turned in time</h3>
						<p className="subtle">You didn't apply the indicator and didn't take the turn in time. Apply the indicator, then take the turn.</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
							<button className="btn" onClick={resetAndRetry}>Retry</button>
						</div>
					</div>
				</div>
			)}
			{outcome === 'jumped_red_signal' && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<div style={{ fontSize: 48, marginBottom: 16 }}>🚨</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>You Have Not Obeyed Traffic Signal Rules!</h3>
						<p className="subtle">You moved when the red signal was there. You must stop completely during the red light and wait for the green signal. Then accelerate and continue safely. Please try again.</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
							<button className="btn" onClick={resetAndRetry}>Retry</button>
						</div>
					</div>
				</div>
			)}

			{/* Turn Warning Modal */}
			{turnWarning && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<div style={{ fontSize: 48, marginBottom: 16 }}>↩️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>
							{lastTurnRef.current === 'left' ? 'Left Turn Not Allowed' : 'Right Turn Not Allowed'}
						</h3>
						<p className="subtle">
							For this level, only <strong>{cfg.side === 'left' ? 'Left' : 'Right'} turn</strong> is allowed.<br />
							Do not try to turn the vehicle in the opposite direction.
						</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 20, gap: 12 }}>
							<button
								className="btn-secondary"
								onClick={() => {
									setTurnWarning(false)
									resetAndRetry()
								}}
							>
								Retry
							</button>
							<button
								className="btn"
								onClick={handleWarningContinue}
							>
								Got it, Continue
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Steering Warning Modal */}
			{steeringWarning && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<div style={{ fontSize: 48, marginBottom: 16 }}>🛞</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Steering Not Allowed</h3>
						<p className="subtle">
							For this level, use only <strong>Accelerator</strong> and <strong>Brake</strong> controls.<br />
							Do not try to turn the vehicle with the steering wheel.
						</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 20, gap: 12 }}>
							<button
								className="btn-secondary"
								onClick={() => {
									setSteeringWarning(false)
									resetAndRetry()
								}}
							>
								Retry
							</button>
							<button
								className="btn"
								onClick={handleWarningContinue}
							>
								Got it, Continue
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Countdown Modal */}
			{showCountdown && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Resuming in...</h3>
						<div style={{ fontSize: 48, margin: '16px 0' }}>{countdown}</div>
						<p className="subtle">Get ready to control the car!</p>
					</div>
				</div>
			)}

			{/* Red Light Countdown Modal (Level 4) */}
			{showRedLightCountdown && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Red Light - Wait</h3>
						<div style={{ fontSize: 72, fontWeight: 'bold', color: '#FF4444', marginBottom: 16 }}>
							{redLightCountdown}
						</div>
						<p className="subtle">Wait for the light to turn green before proceeding.</p>
					</div>
				</div>
			)}

			{/* Traffic Signal Countdown Modal (Level 4 - new) */}
			{showTrafficCountdown && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Good! Waiting at Red Light...</h3>
						<div style={{ fontSize: 72, fontWeight: 'bold', color: '#FF0000', marginBottom: 16 }}>
							{trafficCountdown}
						</div>
						<p className="subtle">Green light coming soon. Get ready to accelerate.</p>
					</div>
				</div>
			)}

			{/* Overspeed Modal (Level 5) */}
			{outcome === 'overspeed' && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Speed Limit Exceeded!</h3>
						<p className="subtle">
							You exceeded the speed limit of <strong>{cfg.speedLimit} km/h</strong>.<br />
							Safe driving requires maintaining the speed limit. Drive within the speed limit and try again.
						</p>
						<div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
							<button className="btn" onClick={resetAndRetry}>Retry</button>
						</div>
					</div>
				</div>
			)}

			{/* Speed Alert Modal */}
			{speedAlert && (
				<div className="modal-overlay" role="dialog" aria-modal>
					<div className="modal card error" style={{ textAlign: 'center' }}>
						<div className="modal-emoji" aria-hidden>⚠️</div>
						<h3 className="heading-xl" style={{ fontSize: 24 }}>Car Speed Alert</h3>
						<p className="subtle">
							Car is at <strong>{Math.round(lastSpeedRef.current * cfg.speedMultiplier)} km/h</strong> &amp; <strong>{lastSpeedRef.current.toFixed(2)}x</strong> speed.<br />
							Control your car accordingly!
						</p>
					</div>
				</div>
			)}

		</div>
	)
}
