import { MODULE_ID } from "./main.js";

export function registerSettings() {
    const settings = {
        "gmOnly": {
            scope: "world",
            config: true,
            default: true,
            type: Boolean,
        },
        "autoHide": {
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
        },
        "useNavigation": {
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
        },
        "path": {
            scope: "client",
            config: false,
            default: [],
            type: Array,
            onChange: () => ui.nav.render(true),
        },
        "dynamicSorting": {
            scope: "world",
            config: true,
            default: true,
            type: Boolean,
        },
        "clickViewScene": {
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
        },
    };

    registerSettingsArray(settings);
}

export function getSetting(key) {
    return game.settings.get(MODULE_ID, key);
}

export async function setSetting(key, value) {
    return await game.settings.set(MODULE_ID, key, value);
}

function registerSettingsArray(settings) {
    for (const [key, value] of Object.entries(settings)) {
        if (!value.name) value.name = `${MODULE_ID}.settings.${key}.name`
        if (!value.hint) value.hint = `${MODULE_ID}.settings.${key}.hint`
        game.settings.register(MODULE_ID, key, value);
    }
}