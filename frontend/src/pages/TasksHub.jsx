import HubPage from '../components/hub/HubPage';
import { HUB_TYPES, getHubConfig } from '../config/hubConfigs';

function TasksHub() {
  const config = getHubConfig(HUB_TYPES.TASKS);
  return <HubPage config={config} />;
}

export default TasksHub;