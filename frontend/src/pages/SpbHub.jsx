import HubPage from '../components/hub/HubPage';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';

function SpbHub() {
  const config = getHubConfig(HUB_TYPES.SPB);
  return <HubPage config={config} />;
}

export default SpbHub;