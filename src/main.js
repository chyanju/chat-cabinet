import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

import '@shoelace-style/shoelace/dist/themes/dark.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.20.1/cdn/');

import './assets/style.css';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
