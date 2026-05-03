import fs from 'node:fs';
import path from 'node:path';

export interface FeatureFlags {
  enablePresentations: boolean;
  enableVideos: boolean;
}

const DEFAULTS: FeatureFlags = {
  enablePresentations: false,
  enableVideos: false,
};

function getSettingsPath(): string {
  return path.join(process.cwd(), 'src', 'content', 'settings.json');
}

export function readSettings(): FeatureFlags {
  try {
    const filePath = getSettingsPath();
    if (!fs.existsSync(filePath)) return { ...DEFAULTS };
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return {
      enablePresentations: data.enablePresentations ?? DEFAULTS.enablePresentations,
      enableVideos: data.enableVideos ?? DEFAULTS.enableVideos,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeSettings(flags: Partial<FeatureFlags>): FeatureFlags {
  const current = readSettings();
  const updated: FeatureFlags = {
    enablePresentations: flags.enablePresentations ?? current.enablePresentations,
    enableVideos: flags.enableVideos ?? current.enableVideos,
  };
  const filePath = getSettingsPath();
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  return updated;
}
