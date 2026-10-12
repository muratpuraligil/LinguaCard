import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { google } from '@ai-sdk/google';

export default {
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:5173', // LinguaCard'ın çalıştığı yerel port (3000 veya 5173)
        command: {
          executable: 'node',
          args: ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'],
          log: '.e2e/logs/app.log',
          reuseExisting: true,
        },
      },
    },
  ],
  agents: {
    default: {
      model: google('gemini-2.5-flash'),
      system: 'Sen titiz bir QA test ajanısın. Ekrandaki her sonucu doğrula.',
    },
  },
} satisfies E2EConfig;
