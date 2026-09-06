import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.info(`Server running in ${config.nodeEnv} mode on http://localhost:${config.port}`);
});
