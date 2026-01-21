import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function LevelIntro() {
	const navigate = useNavigate()
	const { id } = useParams()

	const cfg = useMemo(() => {
		switch (id) {
			case 'lvl-1':
				return {
					title: 'Level 1 — Brake for obstacle', specifics: [
						'Hint “Brake Now” appears between 4s and 7s.',
						'Apply brake (reduce speed to 0x) within the hint to pass.'
					]
				}
			case 'lvl-2':
				return {
					title: 'Level 2 — Right indicator and turn', specifics: [
						'Right indicator hint ~ 8–13s. Turn hint ~ 10–14s.',
						'Toggle Right Indicator during its window, then take Right Turn during its window.'
					]
				}
			case 'lvl-3':
				return {
					title: 'Level 3 — Left indicator and turn', specifics: [
						'Left indicator hint ~ 11–16s. Turn hint ~ 13–17s.',
						'Toggle Left Indicator during its window, then take Left Turn during its window.'
					]
				}
			case 'lvl-4':
				return {
					title: 'Level 4 — Stop at red light in traffic.', specifics: [
						'Hint "Stop Now" appears 8–12s.',
						'Apply brake (reduce speed to 0x) within the window to pass.'
					]
				}
			case 'lvl-5':
				return {
					title: 'Level 5 — Maintain Speed Limit', specifics: [
						'Speed limit is 70 km/h.',
						'At 4 seconds, the speed limit indicator appears.',
						'Do NOT exceed 70 km/h during the entire drive.',
						'If you exceed the limit, you will see a red warning and hear a beep, but the level will NOT pause.',
						'Drive carefully to complete the level successfully.'
					]
				}
			default:
				return { title: 'Level', specifics: [] }
		}
	}, [id])

	const [seatBelt, setSeatBelt] = useState(false)
	const [seatAdjusted, setSeatAdjusted] = useState(false)
	const [error, setError] = useState('')

	function handleStart() {
		if (!seatBelt || !seatAdjusted) {
			if (!seatBelt && !seatAdjusted) setError('Seat belt not fastened and seat not adjusted. Please complete both for your safety!')
			else if (!seatBelt) setError('Seat belt not fastened. Please wear seat belt for your safety')
			else setError('Seat not adjusted. Please adjust your seat for your safety')
			return
		}
		setError('')
		navigate(`/level/${id}`)
	}

	return (
		<div className="container">
			<div className="card" style={{ maxWidth: 820, margin: '24px auto', padding: 20 }}>
				<h2 className="heading-xl" style={{ margin: 0 }}>{cfg.title}</h2>
				<p className="subtle" style={{ marginTop: 4 }}>Read carefully before starting. You must wear seat belt to begin.</p>
				<div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
					<div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<strong>Seat belt</strong>
							<div className="subtle">Fasten your seat belt.</div>
						</div>
						<label className="switch">
							<input type="checkbox" checked={seatBelt} onChange={(e) => setSeatBelt(e.target.checked)} />
							<span className="slider" />
						</label>
					</div>
					<div className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
						<div>
							<strong>Adjust seat</strong>
							<div className="subtle">Adjust mirror, seat position for good visibility.</div>
						</div>
						<label className="switch">
							<input type="checkbox" checked={seatAdjusted} onChange={(e) => setSeatAdjusted(e.target.checked)} />
							<span className="slider" />
						</label>
					</div>
					<div className="card" style={{ padding: 12 }}>
						<strong>How controls work</strong>
						<ul style={{ margin: '8px 0 0 18px' }}>
							<li>Accelerate: press or hold to increase speed up to 2x.</li>
							<li>Brake: press or hold to reduce speed; 0x pauses.</li>
							<li>Indicators: toggle Left/Right indicator buttons.</li>
							<li>Turns: press Left/Right turn buttons during hint window.</li>
							<li><strong>Important:</strong> Use controls only when the on-screen hint appears. Acting before or outside hint windows will result in failure.</li>
						</ul>
					</div>
					{cfg.specifics.length > 0 && (
						<div className="card" style={{ padding: 12 }}>
							<strong>Level specifics</strong>
							<ul style={{ margin: '8px 0 0 18px' }}>
								{cfg.specifics.map((s, i) => <li key={i}>{s}</li>)}
							</ul>
						</div>
					)}
					{error && (
						<div className="card" style={{ fontSize: 25, padding: 12, borderColor: 'rgba(239,68,68,0.55)', background: 'rgba(255, 4, 4, 0.14)' }}>
							<strong style={{ color: '#ff0000ff' }}>{error}</strong>
						</div>
					)}
					<div className="row" style={{ justifyContent: 'flex-end', gap: 12 }}>
						<button className="btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
						<button className="btn" onClick={handleStart}>I understand</button>
					</div>
				</div>
			</div>
		</div>
	)
}


