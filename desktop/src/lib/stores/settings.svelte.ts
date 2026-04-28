import { Store } from '@tauri-apps/plugin-store';
import { getDaemonClient } from '$lib/daemon/client.js';

const STORE_FILE = 'elefant-preferences.json';

interface AppSettings {
	daemonUrl: string;
	autoStartDaemon: boolean;
	/** Absolute path to the Elefant project root (where package.json + src/ live). */
	daemonProjectPath: string;
}

const DEFAULT_SETTINGS: AppSettings = {
	daemonUrl: 'http://localhost:1337',
	autoStartDaemon: false,
	daemonProjectPath: '',
};

let daemonUrl = $state<string>(DEFAULT_SETTINGS.daemonUrl);
let autoStartDaemon = $state<boolean>(DEFAULT_SETTINGS.autoStartDaemon);
let daemonProjectPath = $state<string>(DEFAULT_SETTINGS.daemonProjectPath);

let store: Store | null = null;

async function getStore(): Promise<Store> {
	if (!store) {
		store = await Store.load(STORE_FILE);
	}
	return store;
}

export async function initSettings(): Promise<void> {
	try {
		const s = await getStore();
		const savedUrl = await s.get<string>('daemonUrl');
		const savedAutoStart = await s.get<boolean>('autoStartDaemon');
		const savedProjectPath = await s.get<string>('daemonProjectPath');

		if (savedUrl && typeof savedUrl === 'string') {
			daemonUrl = savedUrl;
		}
		if (typeof savedAutoStart === 'boolean') {
			autoStartDaemon = savedAutoStart;
		}
		if (savedProjectPath && typeof savedProjectPath === 'string') {
			daemonProjectPath = savedProjectPath;
		}

		// Update daemon client with persisted URL
		getDaemonClient(daemonUrl);
	} catch {
		// Use defaults on error
	}
}

export async function setDaemonUrl(url: string): Promise<void> {
	daemonUrl = url;
	getDaemonClient(url); // Update singleton

	try {
		const s = await getStore();
		await s.set('daemonUrl', url);
		await s.save();
	} catch {
		// Silent
	}
}

export async function setAutoStartDaemon(value: boolean): Promise<void> {
	autoStartDaemon = value;

	try {
		const s = await getStore();
		await s.set('autoStartDaemon', value);
		await s.save();
	} catch {
		// Silent
	}
}

export async function setDaemonProjectPath(path: string): Promise<void> {
	daemonProjectPath = path;

	try {
		const s = await getStore();
		await s.set('daemonProjectPath', path);
		await s.save();
	} catch {
		// Silent
	}
}

export const settingsStore = {
	get daemonUrl() { return daemonUrl; },
	get autoStartDaemon() { return autoStartDaemon; },
	get daemonProjectPath() { return daemonProjectPath; },
	init: initSettings,
	setDaemonUrl,
	setAutoStartDaemon,
	setDaemonProjectPath,
};
