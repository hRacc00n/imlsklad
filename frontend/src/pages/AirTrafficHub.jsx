import HubPage from '../components/hub/HubPage';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';

function AirTrafficHub() {
  const config = getHubConfig(HUB_TYPES.AIR_TRAFFIC);
  return <HubPage config={config} />;
}

export default AirTrafficHub;