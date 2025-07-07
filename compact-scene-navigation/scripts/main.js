import {initConfig} from "./config.js";
import { getSetting, registerSettings } from "./settings.js";
import { CompactSceneNavigation } from "./app/SceneNavigation.js";

export const MODULE_ID = "compact-scene-navigation";

Hooks.once("renderSceneNavigation", () => {
    if(getSetting("gmOnly") && !game.user.isGM) return;
    ui.nav = new CompactSceneNavigation();
    ui.nav.render(true);
});

Hooks.on("init", () => {
    initConfig();
    registerSettings();
});