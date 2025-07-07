import { MODULE_ID, CONSTS } from "./main.js";
import { GlobalConfig } from "./globalConfig.js";

export function registerSettings() {
    const settings = {
        globalConfig: {
            type: Object,
            config: false,
            default: CONSTS,
            scope: "world",
        },
        hideActorHeaderText: {
            name: game.i18n.localize(`${MODULE_ID}.settings.hideActorHeaderText.name`),
            hint: game.i18n.localize(`${MODULE_ID}.settings.hideActorHeaderText.hint`),
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
        },
        paperDollPosition: {
            name: game.i18n.localize(`${MODULE_ID}.settings.paperDollPosition.name`),
            hint: game.i18n.localize(`${MODULE_ID}.settings.paperDollPosition.hint`),
            scope: "world",
            config: true,
            default: "left",
            type: String,
            choices: {
                left: game.i18n.localize(`${MODULE_ID}.settings.paperDollPosition.choices.left`),
                right: game.i18n.localize(`${MODULE_ID}.settings.paperDollPosition.choices.right`),
                center: game.i18n.localize(`${MODULE_ID}.settings.paperDollPosition.choices.center`),
            },
        },
        autoOpen: {
            name: game.i18n.localize(`${MODULE_ID}.settings.autoOpen.name`),
            hint: game.i18n.localize(`${MODULE_ID}.settings.autoOpen.hint`),
            scope: "client",
            config: true,
            default: false,
            type: Boolean,
        },
        allowNonOwned: {
            name: game.i18n.localize(`${MODULE_ID}.settings.allowNonOwned.name`),
            hint: game.i18n.localize(`${MODULE_ID}.settings.allowNonOwned.hint`),
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
        },
        playerOwnedOnly: {
            name: game.i18n.localize(`${MODULE_ID}.settings.playerOwnedOnly.name`),
            hint: game.i18n.localize(`${MODULE_ID}.settings.playerOwnedOnly.hint`),
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
        },
    };

    registerSettingsArray(settings);

    game.settings.registerMenu(MODULE_ID, "globalConfigMenu", {
        name: game.i18n.localize(`${MODULE_ID}.settings.globalConfigMenu.name`),
        label: game.i18n.localize(`${MODULE_ID}.settings.globalConfigMenu.label`),
        hint: game.i18n.localize(`${MODULE_ID}.settings.globalConfigMenu.hint`),
        icon: "fas fa-cogs",
        type: GlobalConfig,
        restricted: true,
    });
}

export function getSetting(key) {
    if (key == "globalConfig") return foundry.utils.deepClone(foundry.utils.mergeObject(CONSTS, game.settings.get(MODULE_ID, key)));
    return game.settings.get(MODULE_ID, key);
}

export async function setSetting(key, value) {
    return await game.settings.set(MODULE_ID, key, value);
}

function registerSettingsArray(settings) {
    for (const [key, value] of Object.entries(settings)) {
        game.settings.register(MODULE_ID, key, value);
    }
}
