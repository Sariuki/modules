import { MODULE_ID, CONSTS } from "./main";
import { getSetting } from "./settings";
import { ActorConfig } from "./actorConfig";
import {FormBuilder} from "./lib/formBuilder";

export const PAPER_DOLL_WIDTH = 450;
export class PaperDoll extends Application {
    constructor(actor) {
        super();
        this.#actor = actor;
        this.wrapSheet();
        document.documentElement.style.setProperty("--paper-doll-main-color", getSetting("globalConfig").MAIN_COLOR);
        document.documentElement.style.setProperty("--paper-doll-slot-hue-rotate", getSetting("globalConfig").HUE_ROTATE + "deg");
        this.updateActorHook = Hooks.on("updateActor", (actor, updates) => {
            if (actor.id === this.actor.id) this.render(true);
        });
    }

    #actor;

    get actor() {
        return this.#actor;
    }

    get title() {
        return this.actor.name;
    }

    static get APP_ID() {
        return "paper-doll";
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: this.APP_ID,
            template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
            popOut: true,
            resizable: getSetting("paperDollPosition") === "center",
            minimizable: true,
            width: PAPER_DOLL_WIDTH,
            height: 700,
            classes: ["paper-doll"],
            title: game.i18n.localize(`${MODULE_ID}.app.${this.APP_ID}.title`),
        });
    }

    get id() {
        return this.constructor.APP_ID + "-" + this.actor.uuid;
    }

    getSlots() {
        return foundry.utils.deepClone(this.actor.getFlag(MODULE_ID, "slots") ?? {});
    }

    wrapSheet() {
        const sheet = this.actor.sheet;
        if (!sheet || this.resizable) return;
        this._originalSheetSetPosition = sheet.setPosition;
        sheet.setPosition = (...args) => {
            const res = this._originalSheetSetPosition.call(sheet, ...args);
            this.attachToSheet();
            return res;
        };
        this._originalClose = sheet.close;
        sheet.close = async (...args) => {
            this.unwrapSheet();
            this.close(...args);
            const res = await this._originalClose.call(sheet, ...args);
            return res;
        };
        this._originalMinimize = sheet.minimize;
        sheet.minimize = async (...args) => {
            this.setVisibility(false);
            const res = await this._originalMinimize.call(sheet, ...args);
            return res;
        };
        this._originalMaximize = sheet.maximize;
        sheet.maximize = async (...args) => {
            this.setVisibility(true);
            const res = await this._originalMaximize.call(sheet, ...args);
            return res;
        };
    }

    unwrapSheet() {
        const sheet = this.actor.sheet;
        Hooks.off("updateActor", this.updateActorHook);
        if (!sheet || !this._originalSheetSetPosition) return;
        sheet.setPosition = this._originalSheetSetPosition;
        sheet.minimize = this._originalMinimize;
        sheet.maximize = this._originalMaximize;
        sheet.close = this._originalClose;
    }

    setVisibility(visible) {
        if(!this.element[0]) return;
        this.element[0].closest(".app").style.display = visible ? "" : "none";
    }

    async equip(uuid, equipped, slotData) {
        const item = await fromUuid(uuid);
        if (!item) return;
        Hooks.callAll("paper-doll-equip", this.actor, item, equipped, slotData);
        const update = {};
        const equippedPath = getSetting("globalConfig").EQUIPPED_PATH;
        if (!equippedPath) return;
        foundry.utils.setProperty(update, `system.${equippedPath}`, equipped);
        await item.update(update);
    }

    mapSlots(k) {
        return Object.entries(this.config.SLOTS[k]).map(([key, slots]) => {
            const slotData = [];
            for (let i = 0; i < slots.length; i++) {
                const itemUuid = this.slots[key]?.[i];
                const item = itemUuid ? fromUuidSync(itemUuid) : null;
                const itemColor = item ? game.modules.get("rarity-colors")?.api?.getColorFromItem(item) : "";
                slotData.push({
                    slotIndex: i,
                    slotId: key,
                    image: slots[i].img,
                    item,
                    itemColor,
                    empty: item ? "" : "paper-doll-empty",
                });
            }
            return slotData;
        });
    }

    _onResize(event) {
        super._onResize(event);
    }

    setPosition(...args) {
        super.setPosition(...args);
    }

    async getData() {
        this.slots = this.getSlots();
        this.config = getSetting("globalConfig");
        const data = {
            left: this.mapSlots("LEFT"),
            right: this.mapSlots("RIGHT"),
            bottomLeftWrist: this.mapSlots("BOTTOM_LEFT_WRIST"),
            bottomLeftMain: this.mapSlots("BOTTOM_LEFT_MAIN"),
            bottomRightWrist: this.mapSlots("BOTTOM_RIGHT_WRIST"),
            bottomRightMain: this.mapSlots("BOTTOM_RIGHT_MAIN"),
            actor: this.actor,
            portraitImage: this.actor.getFlag(MODULE_ID, "img") || this.actor.img,
        };
        return data;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;

        this.attachToSheet();

        const objectFit = this.actor.getFlag(MODULE_ID, "objectFit") || "cover";

        html.querySelector(".paper-doll-portrait").style.objectFit = objectFit;

        html.querySelectorAll(".paper-doll-slot").forEach((slot) => {
            slot.addEventListener("dragstart", this._onDragStart.bind(this));
            slot.addEventListener("drop", this._onDrop.bind(this));
            slot.addEventListener("contextmenu", this._onContextMenu.bind(this));
            slot.addEventListener("click", this._onClick.bind(this));
        });

        html.querySelectorAll(".paper-doll-control").forEach((control) => {
            control.addEventListener("click", async (event) => {
                const action = event.currentTarget.dataset.action;
                switch (action) {
                    case "close":
                        this.close();
                        break;
                    case "configure":
                        new ActorConfig(this.actor).render(true);
                        break;
                }
            });
        });

        this.setPendantMargin();
    }

    _onClick(event) {
        event.stopPropagation();
        const slotIndex = event.currentTarget.dataset.index;
        const slotId = event.currentTarget.dataset.id;
        const itemUuid = this.slots[slotId]?.[slotIndex];
        const item = itemUuid ? fromUuidSync(itemUuid) : null;
        if (item) return item.sheet.render(true);
        const slotFilter = Object.values(this.config.SLOTS).find((slot) => slot[slotId])[slotId][slotIndex].filter;
        const slotSimpleFilter = Object.values(this.config.SLOTS).find((slot) => slot[slotId])[slotId][slotIndex].simpleFilter;
        if (!slotFilter && !slotSimpleFilter?.length) return;

        let items = this.filterItems(this.actor.items, slotId, slotIndex);

        if (!items.length) return;

        this.setCenterContainerItems(items, slotId, slotIndex);
    }

    filterItems(items, slotId, slotIndex) {

        const slotFilter = Object.values(this.config.SLOTS).find((slot) => slot[slotId])[slotId][slotIndex].filter;
        const slotSimpleFilter = Object.values(this.config.SLOTS).find((slot) => slot[slotId])[slotId][slotIndex].simpleFilter;

        if (slotSimpleFilter) {
            items = items.filter((item) => slotSimpleFilter.includes(item.type));
        }

        if (slotFilter) {
            const filterFunction = new Function("item", slotFilter);
            items = items.filter((item) => filterFunction(item));
        }

        return items;
    }

    setCenterContainerItems(items, slotId, slotIndex) {
        const centerContainerR = this.element[0].querySelector(".paper-doll-center");
        centerContainerR.innerHTML = "";
        const centerContainer = document.createElement("div");
        centerContainer.classList.add("inner");
        centerContainerR.appendChild(centerContainer);
        items.forEach((item) => {
            const itemElement = document.createElement("div");
            itemElement.classList.add("paper-doll-slot");
            itemElement.style.backgroundImage = `url('${item.img}')`;
            itemElement.dataset.tooltip = item.name;
            centerContainer.appendChild(itemElement);
            itemElement.addEventListener("click", async (event) => {
                event.stopPropagation();
                const itemUuid = item.uuid;
                const currentFlag = this.getSlots();
                currentFlag[slotId] ??= {};
                currentFlag[slotId][slotIndex] = itemUuid;
                await this.actor.setFlag(MODULE_ID, "slots", currentFlag);
                await this.equip(itemUuid, true, { slotIndex, slotId });
            });
            itemElement.addEventListener("contextmenu", (event) => {
                event.stopPropagation();
                centerContainerR.innerHTML = "";
            });
        });
    }

    async _onContextMenu(event) {
        //delete item
        event.preventDefault();
        event.stopPropagation();
        const slotIndex = event.currentTarget.dataset.index;
        const slotId = event.currentTarget.dataset.id;
        const currentFlag = this.getSlots();
        currentFlag[slotId] ??= {};
        const currentFlagItem = currentFlag[slotId][slotIndex];
        currentFlag[slotId][slotIndex] = null;
        await this.equip(currentFlagItem, false, { slotIndex, slotId });
        await this.actor.setFlag(MODULE_ID, "slots", currentFlag);
    }

    _onDragStart(event) {
        event.stopPropagation();
        const slotIndex = event.currentTarget.dataset.index;
        const slotId = event.currentTarget.dataset.id;
        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify({
                slotIndex,
                slotId,
                type: "Item",
                uuid: this.slots[slotId]?.[slotIndex],
            }),
        );
    }

    async _onDrop(event) {
        event.stopPropagation();
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData("text/plain"));
        } catch (e) {
            return;
        }
        const slotIndex = event.currentTarget.dataset.index;
        const slotId = event.currentTarget.dataset.id;
        const currentItem = this.slots[slotId]?.[slotIndex];

        const draggedId = data.slotId;
        const draggedIndex = data.slotIndex;
        const item = await fromUuid(data.uuid);

        // Check filter
        const isAllowed = this.filterItems([item], slotId, slotIndex).length;
        if (!isAllowed) return ui.notifications.warn(`${MODULE_ID}.app.paper-doll.disallowed`, { localize: true });

        if (item?.parent !== this.actor && !getSetting("allowNonOwned")) return;
        const swapItems = draggedId !== undefined && draggedIndex !== undefined;
        const currentFlag = this.getSlots();
        currentFlag[slotId] ??= {};

        if (swapItems) {
            currentFlag[draggedId][draggedIndex] = currentItem ?? null;
        } else {
            if (currentItem) await this.equip(currentItem, false, { slotIndex, slotId });
        }

        currentFlag[slotId][slotIndex] = item.uuid;

        await this.actor.setFlag(MODULE_ID, "slots", currentFlag);
        if (!swapItems) await this.equip(item.uuid, true, { slotIndex, slotId });
        else Hooks.callAll("paper-doll-swap", this.actor, { slotIndex, slotId, item: item.uuid }, { slotIndex: draggedIndex, slotId: draggedId, item: currentItem });
    }

    _getHeaderButtons() {
        let buttons = super._getHeaderButtons();
        buttons.unshift({
            class: "paper-doll-actor-config",
            icon: "fas fa-cog",
            onclick: () => {
                new ActorConfig(this.actor).render(true);
            },
            label: game.i18n.localize(`${MODULE_ID}.app.${this.constructor.APP_ID}.config`),
        });
        return buttons;
    }

    attachToSheet() {
        if(!this.element[0]) return;
        const sheet = this.actor.sheet;
        const isRendered = sheet.rendered;
        const header = this.element[0].querySelector(".window-header");

        if (!isRendered) return; // header.classList.add("paper-doll-header-visible");

        const { top, left, width, height } = sheet.position;
        const paperDollPosition = getSetting("paperDollPosition");

        if (paperDollPosition == "center" || (paperDollPosition == "left" && left < PAPER_DOLL_WIDTH) || (paperDollPosition == "right" && left > window.innerWidth - PAPER_DOLL_WIDTH)) return header.classList.add("paper-doll-header-visible");

        header.classList.remove("paper-doll-header-visible");

        this.setPosition({
            top: top,
            left: paperDollPosition == "left" ? left - PAPER_DOLL_WIDTH : left + width,
            height: height,
            width: PAPER_DOLL_WIDTH,
        });
    }

    syncMinimized() {
        const sheet = this.actor.sheet;
        const sheetMinimized = sheet.minimized;
        const appMinimized = this.minimized;

        if (sheetMinimized !== appMinimized) {
            if(sheetMinimized) this.minimize();
            else this.maximize();
        }
    }

    setPendantMargin() {
        const pendants = this.element[0].querySelectorAll(".paper-doll-slot[data-id='PENDANT']");
        if (!pendants.length) return;
        const first = pendants[0];
        const last = pendants[pendants.length - 1];
        first.style.marginTop = "calc(var(--paper-doll-flex-gap) * 4)";
        last.style.marginBottom = "calc(var(--paper-doll-flex-gap) * 4)";
    }

    async close(...args) {
        this.unwrapSheet();
        super.close(...args);
    }

    static toggle() {
        const openWindow = Object.values(ui.windows).find((w) => w instanceof PaperDoll);
        if (openWindow) openWindow.close();
        else {
            const actor = ui.activeWindow.object instanceof Actor ? ui.activeWindow.object : game.user.character;
            if (actor) new PaperDoll(actor).render(true);
        }
    }
}
