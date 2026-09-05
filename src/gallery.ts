import { mount } from 'svelte';
import GameMenu from './components/GameMenu.svelte';
import './gallery-shell.css';
mount(GameMenu, { target: document.getElementById('app')! });
