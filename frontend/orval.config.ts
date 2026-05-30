import { defineConfig } from 'orval';

export default defineConfig({
  huaxia: {
    input: './openapi.json',
    output: {
      mode: 'split',
      target: './src/api/generated/huaxia.ts',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'axios',
      clean: true,
      override: {
        mutator: {
          path: './src/api/httpClient.ts',
          name: 'huaxiaRequest',
        },
      },
    },
  },
});
