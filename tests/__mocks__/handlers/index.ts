/**
 * c2-msw-install-harness — default handler aggregation.
 *
 * Each external boundary owns its own handler file under `tests/__mocks__/
 * handlers/<name>.ts`. This index re-exports the union for `msw-server.ts`.
 *
 * Future epics that integrate new external HTTP boundaries (e.g., payments,
 * email) add a new file alongside `pinterest.ts` / `gemini.ts` and append
 * its handlers to the array below.
 */
import { geminiHandlers } from './gemini';
import { pinterestHandlers } from './pinterest';

export const handlers = [...pinterestHandlers, ...geminiHandlers];
