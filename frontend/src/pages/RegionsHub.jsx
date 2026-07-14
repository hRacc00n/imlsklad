import HubPage from '../components/hub/HubPage';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';

function RegionsHub() {
  const config = getHubConfig(HUB_TYPES.REGIONS);
  return <HubPage config={config} hideCreateButton={true} />;
}

export default RegionsHub;