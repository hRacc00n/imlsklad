import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import HubPage from '../components/hub/HubPage';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';
import './RegionsHub.css';

function RegionsHub() {
  const navigate = useNavigate();
  const config = getHubConfig(HUB_TYPES.REGIONS);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleGoToGallery = () => {
    navigate('/hub/gallery');
  };

  return (
    <div className="regions-hub-wrapper">
      <HubPage 
        config={config} 
        hideCreateButton={true}
        customHeaderButton={
          isMobile ? (
            <button 
              className="regions-hub-header-btn"
              onClick={handleGoToGallery}
            >
              🖼️ Галерея
            </button>
          ) : null
        }
      />
      
      {!isMobile && (
        <div className="regions-hub-gallery-btn-container">
          <button 
            className="regions-hub-gallery-btn"
            onClick={handleGoToGallery}
          >
            🖼️ Галерея отгрузок
          </button>
        </div>
      )}
    </div>
  );
}

export default RegionsHub;