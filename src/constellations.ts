import { mount } from 'svelte';
import ConstellationApp from './ConstellationApp.svelte';
import './constellation.css';
mount(ConstellationApp, { target: document.getElementById('app')! });
