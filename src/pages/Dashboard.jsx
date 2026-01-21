import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import LevelCard from '../ui/LevelCard'
import logo from '../logos/logo.png'

import level1Img from '../images/level1.jpg'
import level2Img from '../images/level2.png'
import level3Img from '../images/level3.png'
import level4Img from '../images/level4.png'
import level5Img from '../images/level5.png'

function generateLevels() {
	// 5 level groups, each with image & status
	const groups = [
		{
			id: 'lvl-1',
			name: 'Level 1',
			image: level1Img,
			completed: false,
			description: 'Brake for Obstacles'
		},
		{
			id: 'lvl-2',
			name: 'Level 2',
			image: level2Img,
			completed: false,
			description: 'Right indicator and turn'
		},
		{
			id: 'lvl-3',
			name: 'Level 3',
			image: level3Img,
			completed: false,
			description: 'Left indicator and turn'
		},
		{
			id: 'lvl-4',
			name: 'Level 4',
			image: level4Img,
			completed: false,
			description: 'Stop at red light in traffic.'
		},
		{
			id: 'lvl-5',
			name: 'Level 5',
			image: level5Img,
			completed: false,
			description: 'Maintain Speed Limit'
		},
	]
	return groups
}

export default function Dashboard() {
	const navigate = useNavigate()
	const [name, setName] = useState('')
	const baseLevels = useMemo(() => generateLevels(), [])
	const [levels, setLevels] = useState(baseLevels)
	const [isChangeUserOpen, setIsChangeUserOpen] = useState(false)
	const [pendingUserName, setPendingUserName] = useState('')

	const storageKeyForUser = useCallback((userName) => `userLevels:${userName}`, [])

	const loadLevelsForUser = useCallback((userName) => {
		try {
			const raw = localStorage.getItem(storageKeyForUser(userName))
			if (!raw) return null
			const parsed = JSON.parse(raw)
			if (!parsed || typeof parsed !== 'object') return null
			return parsed
		} catch {
			return null
		}
	}, [storageKeyForUser])

	const saveLevelsForUser = useCallback((userName, nextLevels) => {
		const compact = nextLevels.map(l => ({ id: l.id, completed: l.completed }))
		localStorage.setItem(storageKeyForUser(userName), JSON.stringify(compact))
	}, [storageKeyForUser])

	useEffect(() => {
		const saved = localStorage.getItem('userName')
		if (!saved) {
			navigate('/', { replace: true })
			return
		}
		setName(saved)
		// load per-user levels or initialize to all pending
		const savedLevels = loadLevelsForUser(saved)
		if (Array.isArray(savedLevels)) {
			const map = new Map(savedLevels.map(({ id, completed }) => [id, !!completed]))
			setLevels(baseLevels.map(l => ({ ...l, completed: map.get(l.id) ?? false })))
		} else {
			const initial = baseLevels.map(l => ({ ...l, completed: false }))
			setLevels(initial)
			saveLevelsForUser(saved, initial)
		}
	}, [navigate, baseLevels, loadLevelsForUser, saveLevelsForUser])

	const openChangeUser = useCallback(() => {
		setPendingUserName('')
		setIsChangeUserOpen(true)
	}, [])

	const confirmChangeUser = useCallback(() => {
		const trimmed = pendingUserName.trim()
		if (!trimmed) return
		localStorage.setItem('userName', trimmed)
		setName(trimmed)
		const resetLevels = baseLevels.map(l => ({ ...l, completed: false }))
		setLevels(resetLevels)
		localStorage.removeItem(storageKeyForUser(trimmed))
		saveLevelsForUser(trimmed, resetLevels)
		setIsChangeUserOpen(false)
		// Mark that welcome should show personalized for the changed user
		try { sessionStorage.setItem('showWelcome', '1') } catch { }
		navigate('/')
	}, [pendingUserName, baseLevels, saveLevelsForUser, storageKeyForUser, navigate])

	const handleExit = useCallback(() => {
		// Clear stored user and return to welcome landing (no prefilled name)
		try { localStorage.removeItem('userName') } catch { }
		navigate('/')
	}, [navigate])

	const cancelChangeUser = useCallback(() => {
		setIsChangeUserOpen(false)
	}, [])

	const handleToggle = useCallback((levelId) => {
		setLevels(prev => {
			const next = prev.map(l => l.id === levelId ? { ...l, completed: !l.completed } : l)
			saveLevelsForUser(name, next)
			return next
		})
	}, [name, saveLevelsForUser])

	return (
		<div className="container">
			<div className="card" style={{ marginBottom: 16, padding: 16, textAlign: 'center' }}>
				<img src={logo} alt="App logo" className="app-logo app-logo--small" style={{ marginBottom: 8 }} />
				<h1 className="heading-xl title-gradient" style={{ margin: 0 }}>Driving Awareness</h1>
				<br></br>
				<div className="subtle">by Toyoda Gosei</div>
			</div>
			<div className="topbar card">
				<div>
					<h2 className="heading-xl" style={{ margin: 0 }}>Hi {name}</h2>
					<div className="subtle">Your personalized level dashboard</div>
				</div>
				<div className="row">
					<span className="chip">Levels: {levels.length}</span>
					<button className="btn-secondary" onClick={handleExit} style={{ marginRight: 8 }}>Exit</button>
					<button className="btn" onClick={openChangeUser}>Change user</button>
				</div>
			</div>

			<div className="grid">
				{levels.map(level => (
					<LevelCard key={level.id} level={level} onToggle={handleToggle} />
				))}
			</div>

			{isChangeUserOpen && (
				<div className="modal-overlay" role="dialog" aria-modal="true">
					<div className="modal card">
						<h3 className="heading-xl" style={{ fontSize: 24, marginBottom: 4 }}>Change user</h3>
						<div className="subtle" style={{ marginBottom: 12 }}>Enter a name. This will reset levels to Pending for the new user.</div>
						<input
							className="input"
							placeholder="New user name"
							value={pendingUserName}
							onChange={(e) => setPendingUserName(e.target.value)}
							autoFocus
							maxLength={40}
						/>
						<div className="row modal-actions" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
							<button className="btn-secondary" onClick={cancelChangeUser}>Cancel</button>
							<button className="btn" onClick={confirmChangeUser} disabled={!pendingUserName.trim()}>Save</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

