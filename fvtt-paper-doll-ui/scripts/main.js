import { initConfig, registerHotkeys } from "./config.js";
import { registerSettings, getSetting } from "./settings.js";
import { PaperDoll } from "./app.js";

export const MODULE_ID = "fvtt-paper-doll-ui";

export const CONSTS = {
    EQUIPPED_PATH: "",
    HUE_ROTATE: 0,
    MAIN_COLOR: "#191005",
    SLOTS: {
        LEFT: {
            HEAD: [
                {
                    img: "icons/equipment/head/helm-barbute-engraved-steel.webp",
                },
            ],
            CAPE: [
                {
                    img: "icons/equipment/back/cape-layered-red.webp",
                },
            ],
            BODY: [
                {
                    img: "icons/equipment/chest/breastplate-layered-steel.webp",
                },
            ],
            GLOVES: [
                {
                    img: "icons/equipment/hand/glove-frayed-cloth-grey.webp",
                },
            ],
            BOOTS: [
                {
                    img: "icons/equipment/feet/boots-armored-layered-steel.webp",
                },
            ],
        },
        RIGHT: {
            TRINKET: [
                {
                    img: "icons/tools/laboratory/alembic-glass-ball-blue.webp",
                },
                {
                    img: "icons/tools/laboratory/alembic-glass-ball-blue.webp",
                },
                {
                    img: "icons/tools/laboratory/alembic-glass-ball-blue.webp",
                },
            ],
            PENDANT: [
                {
                    img: "icons/equipment/neck/pendant-rough-red.webp",
                },
            ],
            RING: [
                {
                    img: "icons/equipment/finger/ring-band-gold.webp",
                },
                {
                    img: "icons/equipment/finger/ring-band-gold.webp",
                },
            ],
        },
        BOTTOM_LEFT_WRIST: {
            WRIST_LEFT: [
                {
                    img: "icons/sundries/lights/torch-black.webp",
                },
            ],
        },
        BOTTOM_LEFT_MAIN: {
            MAIN_LEFT: [
                {
                    img: "icons/weapons/swords/shortsword-winged.webp",
                },
                {
                    img: "icons/weapons/swords/shortsword-winged.webp",
                },
            ],
        },
        BOTTOM_RIGHT_WRIST: {
            WRIST_RIGHT: [
                {
                    img: "icons/weapons/thrown/bomb-fuse-cloth-pink.webp",
                },
            ],
        },
        BOTTOM_RIGHT_MAIN: {
            MAIN_RIGHT: [
                {
                    img: "icons/weapons/bows/shortbow-recurve-bone.webp",
                },
                {
                    img: "icons/weapons/bows/shortbow-recurve-bone.webp",
                },
            ],
        },
    },
};

export const DEFAULTS = foundry.utils.deepClone(CONSTS);

const getEquippedPath = () => {
    switch (game.system.id) {
        case "dnd5e":
            return "equipped";
        default:
            return "";
    }
};
//
Hooks.on("init", () => {
    CONSTS.EQUIPPED_PATH = getEquippedPath();
    initConfig();
    registerHotkeys();
    registerSettings();
    ui.paperDoll = PaperDoll;
});

Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
    const playerOwnedOnly = getSetting("playerOwnedOnly");
    const actor = app.object ?? app.actor;
    if (playerOwnedOnly && !actor.hasPlayerOwner) return;
    buttons.unshift({
        class: "paper-doll",
        icon: "fa-duotone fa-person",
        onclick: () => {
            const actor = app.object ?? app.actor;
            const openWindow = Object.values(ui.windows).find((w) => w instanceof PaperDoll && w.actor === actor);
            if (openWindow) openWindow.close();
            else new PaperDoll(app.object ?? app.actor).render(true);
        },
        label: getSetting("hideActorHeaderText") ? "" : game.i18n.localize(`${MODULE_ID}.app.paper-doll.title`),
    });
    const autoOpenSetting = getSetting("autoOpen");
    const autoOpenFlag = app.actor.getFlag(MODULE_ID, "autoOpen") || "useDefault";
    if ((autoOpenFlag === "useDefault" && autoOpenSetting) || autoOpenFlag === "true") {
        setTimeout(() => {
            new PaperDoll(app.object ?? app.actor).render(true);
        }, 10);
    }
});
