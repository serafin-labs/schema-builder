import { Options } from "ajv"

const defaultAJVConfig: Options = {
    coerceTypes: false,
    removeAdditional: false,
    useDefaults: true,
    strict: false,
    allErrors: true,
}

class ConfigManager {
    private static instance: ConfigManager
    private ajvConfig: Options

    private constructor() {
        this.ajvConfig = { ...defaultAJVConfig }
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager()
        }
        return ConfigManager.instance
    }

    public getAJVConfig(): Options {
        return this.ajvConfig
    }

    public setAJVConfig(newConfig: Partial<Options>): void {
        this.ajvConfig = { ...this.ajvConfig, ...newConfig }
    }
}

export const configManager = ConfigManager.getInstance()
