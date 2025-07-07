import { MODULE_ID } from "./main.js";

export function initConfig() { }

export function registerHotkeys() {
    game.keybindings.register(MODULE_ID, "togglePaperDoll", {
        name: `${MODULE_ID}.hotkeys.togglePaperDoll.name`,
        editable: [{ key: "KeyP", modifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        precedence: CONST.KEYBINDING_PRECEDENCE.PRIORITY,
        onDown: () => {
            ui.paperDoll.toggle();
        },
    });

}