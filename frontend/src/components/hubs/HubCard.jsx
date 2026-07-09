import './HubCard.css';

function HubCard({ name, icon, count, onClick }) {
  console.log(`[HubCard] Рендер ${name}: count=${count}`);
  return (
    <div className="hub-card" onClick={onClick}>
      <div className="hub-card-content">
        <span className="hub-icon">{icon}</span>
        <span className="hub-name">{name}</span>
        <span className="hub-badge">{count}</span>
      </div>
    </div>
  );
}

export default HubCard;