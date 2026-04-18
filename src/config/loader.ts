/**
 * Config loader — discovers, parses, and validates configuration.
 *
 * Discovery order:
 * 1. ./elefant.config.ts (dynamic import)
 * 2. ./elefant.config.json (Bun.file().json())
 * 3. ~/.config/elefant/elefant.config.ts
 * 4. ~/.config/elefant/elefant.config.json
 *
 * If no config file is found the daemon starts with empty defaults
 * (no providers). Users add providers via the desktop Settings UI.
 *
 * Environment variable overrides (applied on top of file config):
 * - ELEFANT_PORT          → config.port
 * - ELEFANT_DEFAULT_PROVIDER → config.defaultProvider
 * - ELEFANT_MODEL         → first provider model
 * - ELEFANT_API_KEY       → first provider apiKey
 * - ELEFANT_BASE_URL      → first provider baseURL
 */

import { z } from "zod";
import { configSchema, type ElefantConfig, type ProviderEntry } from "./schema.ts";
import type { Result } from "../types/result.ts";
import { ok, err } from "../types/result.ts";
import type { ElefantError } from "../types/errors.ts";
import { homedir } from "os";
import { join, resolve } from "path";

interface RawConfig {
	port?: number;
	providers?: ProviderEntry[];
	defaultProvider?: string;
	logLevel?: "debug" | "info" | "warn" | "error";
}

function getSearchPaths(): string[] {
	const home = homedir();
	return [
		"./elefant.config.ts",
		"./elefant.config.json",
		join(home, ".config", "elefant", "elefant.config.ts"),
		join(home, ".config", "elefant", "elefant.config.json"),
	];
}

async function fileExists(path: string): Promise<boolean> {
	try {
		const file = Bun.file(path);
		return await file.exists();
	} catch {
		return false;
	}
}

async function loadTsConfig(path: string): Promise<Result<RawConfig, ElefantError>> {
	try {
		const absolutePath = resolve(path);
		const module = await import(absolutePath);
		const config = module.default ?? module.config;
		if (!config || typeof config !== "object") {
			return err({
				code: "CONFIG_INVALID",
				message: `Config file ${path} must export a config object`,
			});
		}
		return ok(config as RawConfig);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return err({
			code: "CONFIG_INVALID",
			message: `Failed to load TypeScript config from ${path}: ${message}`,
		});
	}
}

async function loadJsonConfig(path: string): Promise<Result<RawConfig, ElefantError>> {
	try {
		const file = Bun.file(path);
		const config = await file.json();
		if (!config || typeof config !== "object") {
			return err({
				code: "CONFIG_INVALID",
				message: `Config file ${path} must contain a JSON object`,
			});
		}
		return ok(config as RawConfig);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return err({
			code: "CONFIG_INVALID",
			message: `Failed to load JSON config from ${path}: ${message}`,
		});
	}
}

/**
 * Discover and load the first available config file.
 * Returns empty defaults if no file is found — daemon starts regardless.
 */
async function discoverConfig(): Promise<RawConfig> {
	for (const path of getSearchPaths()) {
		if (await fileExists(path)) {
			const result = path.endsWith(".ts")
				? await loadTsConfig(path)
				: await loadJsonConfig(path);
			if (result.ok) return result.data;
			console.error(`[elefant] Config warning: ${result.error.message}`);
		}
	}
	// No config found — start with empty defaults
	return {};
}

function applyEnvOverrides(config: RawConfig): RawConfig {
	const result: RawConfig = { ...config };

	if (process.env.ELEFANT_PORT) {
		const port = parseInt(process.env.ELEFANT_PORT, 10);
		if (!isNaN(port)) result.port = port;
	}

	if (process.env.ELEFANT_DEFAULT_PROVIDER) {
		result.defaultProvider = process.env.ELEFANT_DEFAULT_PROVIDER;
	}

	if (result.providers && result.providers.length > 0) {
		const first = { ...result.providers[0] };
		if (process.env.ELEFANT_MODEL) first.model = process.env.ELEFANT_MODEL;
		if (process.env.ELEFANT_API_KEY) first.apiKey = process.env.ELEFANT_API_KEY;
		if (process.env.ELEFANT_BASE_URL) first.baseURL = process.env.ELEFANT_BASE_URL;
		result.providers = [first, ...result.providers.slice(1)];
	}

	return result;
}

function formatZodErrors(error: z.ZodError): string {
	return error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
}

export async function loadConfig(): Promise<Result<ElefantConfig, ElefantError>> {
	const raw = await discoverConfig();
	const merged = applyEnvOverrides(raw);

	const parsed = configSchema.safeParse(merged);
	if (!parsed.success) {
		return err({
			code: "CONFIG_INVALID",
			message: formatZodErrors(parsed.error),
		});
	}

	return ok(parsed.data);
}
