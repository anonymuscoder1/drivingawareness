import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import level1Src from '../videos/level1.mp4'
import level2Src from '../videos/level2.mp4'
import level3Src from '../videos/level3.mp4'
import level4Src from '../videos/level4.mp4'

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
        },
        'lvl-3': {
            label: 'Level 3',
            hint: 'Left indicator & Left turn',
            action: 'turn',
            side: 'left',
            indicatorWindow: [8.5, 11],
            turnWindow: [10.5, 13.5],
            // threshold when a missed turn should be flagged (seconds)
            turnThreshold: 13.5,
            video: level3Src,
            videoEnd: 22,
        },
        'lvl-4': {
            label: 'Level 4',
            hint: 'Stop Now',
            action: 'stop',
            window: [10, 13.5],
            video: level4Src,
            videoEnd: 14,
            slowAction: {
                hint: 'Slow Down',
                window: [8, 10],
            },
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
        accelerate: false,
        brake: false,
        leftIndicator: false,
        rightIndicator: false,
        turnButtons: false,
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
    const [showIndicatorHint, setShowIndicatorHint] = useState(false)
    const [showTurnHint, setShowTurnHint] = useState(false)
    const indicatorWindow = cfg.indicatorWindow || null
    const turnWindow = cfg.turnWindow || null
    const announcedRef = useRef({ indicator: false, turn: false, slow: false })
    const [showSlowHint, setShowSlowHint] = useState(false)
    const slowWindow = cfg.slowAction?.window || null

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
        if (targetRate <= 0) {
            video.pause()
            return
        }
        video.playbackRate = Math.min(Math.max(targetRate, 0.1), 2)
        video.play().catch(() => { })
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
            if (!brakedInWindowRef.current && outcome == null) setOutcome('late')
        }
        video.addEventListener('timeupdate', onTimeUpdate)
        video.addEventListener('ended', onEnded)
        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate)
            video.removeEventListener('ended', onEnded)
        }
    }, [id, windowStart, windowEnd, cfg.action, indicatorWindow, turnWindow, outcome, slowWindow])

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
                    // For brake or stop action, show success immediately
                    if (cfg.action === 'brake' || cfg.action === 'stop') {
                        setOutcome('success')
                    }
                }
                else setOutcome('late')
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
        announcedRef.current = { indicator: false, turn: false, slow: false }
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
    const [steeringWarning, setSteeringWarning] = useState(false)
    const [turnWarning, setTurnWarning] = useState(false)
    const [showCountdown, setShowCountdown] = useState(false)
    const [countdown, setCountdown] = useState(3)
    const [speedAlert, setSpeedAlert] = useState(false)
    const lastSpeedRef = useRef(0)
    const lastTurnRef = useRef(null) // 'left' | 'right'

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
            if (newState.leftIndicator && !buttonPressed.leftIndicator) {
                setButtonPressed(prev => ({ ...prev, leftIndicator: true }))
                setIndicator(indicator === 'left' ? null : 'left')
                const itLeft = indicator === 'left' ? null : (videoRef.current?.currentTime || 0)
                setIndicatorTime(itLeft)
                indicatorTimeRef.current = itLeft
            } else if (!newState.leftIndicator && buttonPressed.leftIndicator) {
                setButtonPressed(prev => ({ ...prev, leftIndicator: false }))
            }

            if (newState.rightIndicator && !buttonPressed.rightIndicator) {
                setButtonPressed(prev => ({ ...prev, rightIndicator: true }))
                setIndicator(indicator === 'right' ? null : 'right')
                const itRight = indicator === 'right' ? null : (videoRef.current?.currentTime || 0)
                setIndicatorTime(itRight)
                indicatorTimeRef.current = itRight
            } else if (!newState.rightIndicator && buttonPressed.rightIndicator) {
                setButtonPressed(prev => ({ ...prev, rightIndicator: false }))
            }

            // Handle steering with threshold
            if (newState.steering < -0.3) {
                // Check if steering is allowed for this level
                if ((cfg.action === 'brake' || cfg.action === 'stop') && !steeringWarning) {
                    setSteeringWarning(true)
                    return // Stop processing other inputs
                }
                setTurnSide('left')
                const ttLeft = videoRef.current?.currentTime || 0
                setTurnTime(ttLeft)
                turnTimeRef.current = ttLeft
            } else if (newState.steering > 0.3) {
                // Check if steering is allowed for this level
                if ((cfg.action === 'brake' || cfg.action === 'stop') && !steeringWarning) {
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
    }, [indicator, buttonPressed])

    return (
        <div className="video-screen">
            <video ref={videoRef} className="video-el" src={source} controls={false} playsInline />

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
                                🛞
                            </div>
                            <div className="steering-value">
                                {gamepadState.steering > 0.1 ? 'Right' :
                                    gamepadState.steering < -0.1 ? 'Left' : 'Center'}
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
                                <div className="speed-value">{Math.round(targetRate * 100)} km/h</div>
                                <div className="speed-unit">{targetRate.toFixed(2)}x Video</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Indicator side shading overlays */}
                {uiConfig.leftIndicator && indicator === 'left' && (
                    <div className="indicator-shade left on" aria-hidden />
                )}
                {uiConfig.rightIndicator && indicator === 'right' && (
                    <div className="indicator-shade right on" aria-hidden />
                )}
            </div>

            {cfg.action !== 'turn' && showHint && (
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
            <div className={`video-controls ${showControls ? '' : 'hidden'}`}>
                <div className="row" style={{ justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="subtle">{cfg.label} • {name} {(cfg.action === 'brake' || cfg.action === 'stop') ? `(Speed: ${targetRate.toFixed(2)}x)` : ''}</div>
                    <div className="row">
                        {uiConfig.showBack && (
                            <button className="btn-secondary" onClick={() => navigate(-1)}>Back</button>
                        )}
                        <button className="btn-secondary" onClick={() => setShowControls(s => !s)} style={{ marginLeft: 8 }}>{showControls ? 'Hide controls' : 'Show controls'}</button>
                        {showControls && (
                            <>
                                {/* Accelerate/Brake always available */}
                                {uiConfig.accelerate && (
                                    <button
                                        className="btn"
                                        onMouseDown={() => startHold('up')}
                                        onMouseUp={endHold}
                                        onMouseLeave={endHold}
                                        onTouchStart={(e) => { e.preventDefault(); startHold('up') }}
                                        onTouchEnd={endHold}
                                        onClick={() => { lastActionRef.current = 'up'; nudgeRate(0.25) }}
                                    >
                                        Accelerate
                                    </button>
                                )}
                                {uiConfig.brake && (
                                    <button
                                        className="btn"
                                        onMouseDown={() => startHold('down')}
                                        onMouseUp={endHold}
                                        onMouseLeave={endHold}
                                        onTouchStart={(e) => { e.preventDefault(); startHold('down') }}
                                        onTouchEnd={endHold}
                                        onClick={() => { lastActionRef.current = 'down'; nudgeRate(-0.25) }}
                                    >
                                        Brake
                                    </button>
                                )}
                                {/* Indicator buttons (available on all levels) */}
                                {uiConfig.leftIndicator && (
                                    <button className={`btn-indicator ${indicator === 'left' ? 'active' : ''}`} onClick={() => { const it = indicator === 'left' ? null : (videoRef.current?.currentTime || 0); setIndicator(indicator === 'left' ? null : 'left'); setIndicatorTime(it); indicatorTimeRef.current = it }}>
                                        <span className="arrow">&lt;</span> Left Indicator
                                    </button>
                                )}
                                {uiConfig.rightIndicator && (
                                    <button className={`btn-indicator ${indicator === 'right' ? 'active' : ''}`} onClick={() => { const it = indicator === 'right' ? null : (videoRef.current?.currentTime || 0); setIndicator(indicator === 'right' ? null : 'right'); setIndicatorTime(it); indicatorTimeRef.current = it }}>
                                        Right Indicator <span className="arrow">&gt;</span>
                                    </button>
                                )}
                                {/* Turn buttons (available on all levels; validated only for turn levels) */}
                                {uiConfig.turnButtons && (
                                    <>
                                        <button
                                            className="btn"
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
                            </>
                        )}
                    </div>
                </div>
            </div>
            {outcome && (
                <div className="modal-overlay" role="dialog" aria-modal>
                    <div className="modal card" style={{ textAlign: 'center' }}>
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
                                <h3 className="heading-xl" style={{ fontSize: 24 }}>Wrong Direction</h3>
                                <p className="subtle">Failed: You given in the opposite indicator. Try again.</p>
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
                    <div className="modal card" style={{ textAlign: 'center' }}>
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
                    <div className="modal card" style={{ textAlign: 'center' }}>
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
                    <div className="modal card" style={{ textAlign: 'center' }}>
                        <h3 className="heading-xl" style={{ fontSize: 24 }}>Indicator not applied & not turned in time</h3>
                        <p className="subtle">You didn't apply the indicator and didn't take the turn in time. Apply the indicator, then take the turn.</p>
                        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
                            <button className="btn" onClick={resetAndRetry}>Retry</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Turn Warning Modal */}
            {turnWarning && (
                <div className="modal-overlay" role="dialog" aria-modal>
                    <div className="modal card" style={{ textAlign: 'center' }}>
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
                    <div className="modal card" style={{ textAlign: 'center' }}>
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
                    <div className="modal card" style={{ textAlign: 'center' }}>
                        <h3 className="heading-xl" style={{ fontSize: 24 }}>Resuming in...</h3>
                        <div style={{ fontSize: 48, margin: '16px 0' }}>{countdown}</div>
                        <p className="subtle">Get ready to control the car!</p>
                    </div>
                </div>
            )}

            {/* Speed Alert Modal */}
            {speedAlert && (
                <div className="modal-overlay" role="dialog" aria-modal>
                    <div className="modal card" style={{ textAlign: 'center' }}>
                        <h3 className="heading-xl" style={{ fontSize: 24 }}>Car Speed Alert</h3>
                        <p className="subtle">
                            Car is at <strong>{Math.round(lastSpeedRef.current * 100)} km/h</strong> &amp; <strong>{lastSpeedRef.current.toFixed(2)}x</strong> speed.<br />
                            Control your car accordingly!
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
