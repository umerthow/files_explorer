import { createContainer } from './interface/http/container';
import { createServer } from './interface/http/server';

const container = createContainer();
const app = createServer(container);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[backend] listening on http://localhost:${port}`);
  console.log(`[backend] swagger at http://localhost:${port}/docs`);
});
