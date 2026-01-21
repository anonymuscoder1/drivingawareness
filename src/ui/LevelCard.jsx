import { useNavigate } from 'react-router-dom'

export default function LevelCard({ level, onToggle }) {
	const navigate = useNavigate()
	const { id, image, name, completed, description } = level
	const bgClass = completed ? 'bg-success' : 'bg-info'
	return (
		<div className={`card level-card ${bgClass}`} onClick={() => navigate(`/level/${id}/intro`)} style={{ cursor: 'pointer' }}>
			<div className="level-media">
				<img src={image} alt={name} loading="lazy" />
			</div>
			<div className="level-body">
				<div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
					<div className="level-title">{name}</div>
					<span className={`badge ${completed ? 'success' : 'info'}`}>
						<span className={`status-dot ${completed ? 'success' : 'info'}`} />
						{completed ? 'Completed' : 'Pending'}
					</span>
				</div>
				<div className="level-details">
					<div className="subtle">{level.description}</div>
				</div>
				<div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
					<button className="btn" onClick={() => onToggle && onToggle(id)}>
						{completed ? 'Mark Pending' : 'Mark Completed'}
					</button>
					<button className="btn-secondary" onClick={() => navigate(`/level/${id}/intro`)}>Try</button>
				</div>
			</div>
		</div>
	)
}

