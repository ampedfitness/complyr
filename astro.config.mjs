// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://ampedfitness.github.io',
  base: '/complyr',
  integrations: [react()],
});
