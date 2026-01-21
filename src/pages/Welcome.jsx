import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../logos/logo.png'

export default function Welcome() {
	const navigate = useNavigate()
	const [name, setName] = useState('')
	// mode: 'landing' | 'enterName' | 'personalized'
	const [mode, setMode] = useState('landing')

	useEffect(() => {
		// If redirected here after Change User, show personalized welcome.
		try {
			const show = sessionStorage.getItem('showWelcome')
			if (show === '1') {
				sessionStorage.removeItem('showWelcome')
				const saved = localStorage.getItem('userName') || ''
				setName(saved)
				setMode('personalized')
				return
			}
		} catch { }
		// default: landing (do not auto-show name even if stored)
	}, [])

	function onLandingContinue() {
		// user gesture -> try to enter fullscreen (will only succeed if browser allows)
		try {
			const docEl = document.documentElement
			if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => { })
		} catch { }
		setMode('enterName')
	}

	function handleSubmit(e) {
		e.preventDefault()
		const trimmed = name.trim()
		if (!trimmed) return
		localStorage.setItem('userName', trimmed)
		// user gesture -> try to enter fullscreen
		try {
			const docEl = document.documentElement
			if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => { })
		} catch { }
		setMode('personalized')
	}

	function handleContinue() {
		// Continue from personalized welcome is a user gesture; request fullscreen as well
		try {
			const docEl = document.documentElement
			if (docEl.requestFullscreen) docEl.requestFullscreen().catch(() => { })
		} catch { }
		navigate('/dashboard')
	}

	if (mode === 'landing') {
		return (
			<div className="center">
				<div className="card welcome" style={{ textAlign: 'center', maxWidth: 600 }}>
					<img src={logo} alt="App logo" className="app-logo" />
					<h1 className="heading-xl title-gradient" style={{ marginBottom: 8 }}>Driving Awareness</h1>
					<p className="subtle" style={{ marginBottom: 20, fontSize: 16 }}>By Toyoda Gosei</p>
					<p className="subtle" style={{ marginBottom: 24 }}>Welcome! Click continue to enter your name and personalize the dashboard.</p>
					<div style={{ display: 'grid', gap: 8 }}>
						<button className="btn" onClick={onLandingContinue}>Continue</button>
					</div>
				</div>
			</div>
		)
	}

	if (mode === 'enterName') {
		return (
			<div className="center">
				<div className="card welcome">
					<header style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
						<img src={logo} alt="App logo" className="app-logo app-logo--small" style={{ marginBottom: 4 }} />
						<h1 className="heading-xl title-gradient">Welcome</h1>
						<p className="subtle">Enter your name to personalize your dashboard.</p>
					</header>
					<form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
						<input
							className="input"
							placeholder="Your name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							maxLength={40}
							autoFocus
						/>
						<div className="row" style={{ justifyContent: 'flex-end' }}>
							<button className="btn" type="submit" disabled={!name.trim()}>Save</button>
						</div>
					</form>
				</div>
				<p className="footer-note">Your name is stored locally in your browser.</p>
			</div>
		)
	}

	return (
		<div className="center">
			<div className="card welcome" style={{ textAlign: 'center', maxWidth: 500 }}>
				<div style={{ marginBottom: 32, fontSize: 80 }}>🚗</div>
				<h1 className="heading-xl title-gradient" style={{ marginBottom: 8 }}>Driving Awareness</h1>
				<p className="subtle" style={{ marginBottom: 32, fontSize: 16 }}>By Toyoda Gosei</p>
				<p style={{ marginBottom: 24, color: '#888', fontSize: 14 }}>Welcome {name}! Get ready to enhance your driving skills.</p>
				<button className="btn" onClick={handleContinue} style={{ width: '100%' }}>
					Continue
				</button>
			</div>
		</div>
	)
}

