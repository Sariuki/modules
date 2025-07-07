import { MODULE_ID } from "./main.js";

export function registerSettings() {
    const settings = {
        "hideSceneNav": {
            scope: "client",
            config: false,
            default: false,
            type: Boolean,
            onChange: () => ui.partyMonitorDock.setVisibility()
        },
        "hidePartyMonitor": {
            scope: "client",
            config: false,
            default: false,
            type: Boolean,
            onChange: () => ui.partyMonitorDock.setVisibility()
        },
        "portraitSize": {
            name: `${MODULE_ID}.settings.portraitSize.name`,
            hint: `${MODULE_ID}.settings.portraitSize.hint`,
            scope: "client",
            config: true,
            type: String,
            choices: {
                "30px": "combat-tracker-dock.settings.portraitSize.choices.30px",
                "50px": "combat-tracker-dock.settings.portraitSize.choices.50px",
                "70px": "combat-tracker-dock.settings.portraitSize.choices.70px",
                "90px": "combat-tracker-dock.settings.portraitSize.choices.90px",
                "110px": "combat-tracker-dock.settings.portraitSize.choices.110px",
                "150px": "combat-tracker-dock.settings.portraitSize.choices.150px",
                "180px": "combat-tracker-dock.settings.portraitSize.choices.180px",
            },
            default: "70px",
            onChange: () => {
                ui.partyMonitorDock.updateSettings();
            },
        },
        "dockAlignment": {
            name: `${MODULE_ID}.settings.dockAlignment.name`,
            hint: `${MODULE_ID}.settings.dockAlignment.hint`,
            scope: "world",
            config: true,
            type: String,
            choices: {
                "flex-start": `${MODULE_ID}.settings.dockAlignment.choices.flex-start`,
                "center": `${MODULE_ID}.settings.dockAlignment.choices.center`,
                "flex-end": `${MODULE_ID}.settings.dockAlignment.choices.flex-end`,
            },
            default: "center",
            onChange: () => {
                ui.partyMonitorDock.updateSettings();
            },
        },
        "dockSide": {
            name: `${MODULE_ID}.settings.dockSide.name`,
            hint: `${MODULE_ID}.settings.dockSide.hint`,
            scope: "world",
            config: true,
            type: String,
            choices: {
                "left": `${MODULE_ID}.settings.dockSide.choices.left`,
                "right": `${MODULE_ID}.settings.dockSide.choices.right`,
            },
            default: "left",
            onChange: () => {
                ui.partyMonitorDock.updateSettings();
            },
        },
        "onlyConnected": {
            name: `${MODULE_ID}.settings.onlyConnected.name`,
            hint: `${MODULE_ID}.settings.onlyConnected.hint`,
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
            onChange: () => ui.partyMonitorDock.renderPartyMembers(),
        },
        "hideInCombat": {
            name: `${MODULE_ID}.settings.hideInCombat.name`,
            hint: `${MODULE_ID}.settings.hideInCombat.hint`,
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
            onChange: () => ui.partyMonitorDock._onCombatUpdate(),
        },
        "hideCompanions": {
            name: `${MODULE_ID}.settings.hideCompanions.name`,
            hint: `${MODULE_ID}.settings.hideCompanions.hint`,
            scope: "world",
            config: true,
            default: false,
            type: Boolean,
            onChange: () => ui.partyMonitorDock.renderPartyMembers(),
        },
        "cornerImage": {
            name: `${MODULE_ID}.settings.cornerImage.name`,
            hint: `${MODULE_ID}.settings.cornerImage.hint`,
            scope: "world",
            config: true,
            type: String,
            default: "modules/party-monitor-dock/assets/border-fantasy-dark-2/corner.png",
            filePicker: "imagevideo",
            onChange: () => ui.partyMonitorDock.render(true),
        },
        "edgeImage": {
            name: `${MODULE_ID}.settings.edgeImage.name`,
            hint: `${MODULE_ID}.settings.edgeImage.hint`,
            scope: "world",
            config: true,
            type: String,
            default: "modules/party-monitor-dock/assets/border-fantasy-dark-2/edge.png",
            filePicker: "imagevideo",
            onChange: () => ui.partyMonitorDock.render(true),
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
    for(const [key, value] of Object.entries(settings)) {
        game.settings.register(MODULE_ID, key, value);
    }
}