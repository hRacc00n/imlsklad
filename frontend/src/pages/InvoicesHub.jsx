import HubPage from '../components/hub/HubPage';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';

function InvoicesHub() {
  const config = getHubConfig(HUB_TYPES.INVOICES);
  return <HubPage config={config} hideCreateButton={true} />;
}

export default InvoicesHub;