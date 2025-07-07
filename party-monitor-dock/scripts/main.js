import {initConfig} from "./config.js";
import {registerSettings} from "./settings.js";
import { PartyMonitorDock } from "./app.js";

export const MODULE_ID = "party-monitor-dock";

Hooks.on("init", () => {
    initConfig();
    registerSettings();
});

Hooks.on("ready", () => {
    new PartyMonitorDock().render(true);
})