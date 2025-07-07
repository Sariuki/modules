import { MODULE_ID, CONSTS, DEFAULTS } from "./main";

import { getSetting, setSetting } from "./settings";

import { PAPER_DOLL_WIDTH } from "./app";
import {FormBuilder} from "./lib/formBuilder";

export class GlobalConfig extends FormApplication {
    static get APP_ID() {
        return "paper-doll-global-config";
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: this.APP_ID,
            template: `modules/${MODULE_ID}/templates/paper-doll.hbs`,
            popOut: true,
            resizable: true,
            minimizable: true,
            width: PAPER_DOLL_WIDTH,
            height: 800,
            title: game.i18n.localize(`${MODULE_ID}.app.${this.APP_ID}.title`),
        });
    }

    mapSlots(k) {
        return Object.entries(this.config.SLOTS[k]).map(([key, slots]) => {
            const slotData = [];
            for (let i = 0; i < slots.length; i++) {
                slotData.push({
                    slotIndex: i,
                    slotId: key,
                    image: slots[i].img,
                    empty: "paper-doll-empty",
                });
            }
            slotData.push({
                slotIndex: "add",
                slotId: key,
                image: "",
                empty: "paper-doll-empty",
            });
            return slotData;
        });
    }

    async getData() {
        this.config = getSetting("globalConfig");
        const data = {
            left: this.mapSlots("LEFT"),
            right: this.mapSlots("RIGHT"),
            bottomLeftWrist: this.mapSlots("BOTTOM_LEFT_WRIST"),
            bottomLeftMain: this.mapSlots("BOTTOM_LEFT_MAIN"),
            bottomRightWrist: this.mapSlots("BOTTOM_RIGHT_WRIST"),
            bottomRightMain: this.mapSlots("BOTTOM_RIGHT_MAIN"),
            isConfig: true,
            ...this.config,
        };
        return data;
    }

    async activateListeners(html) {
        super.activateListeners(html);
        html = html[0];
        const header = document.querySelector("#paper-doll-global-config .window-header");
        header.classList.add("paper-doll-header-visible");
        html.querySelectorAll(".paper-doll-slot[data-index='add']").forEach((slot) => {
            slot.innerHTML = `<i class="fas fa-plus"></i> Add`;
            slot.style.cursor = "pointer";
        });
        this.setPendantMargin();

        html.querySelectorAll(".paper-doll-slot").forEach((slot) => {
            if (slot.dataset.index == "add") {
                slot.addEventListener("click", (event) => {
                    const slotId = event.currentTarget.dataset.id;
                    this.addSlot(slotId);
                });
            } else {
                slot.addEventListener("click", async (event) => {
                    const slotId = event.currentTarget.dataset.id;
                    const slotIndex = parseInt(event.currentTarget.dataset.index);
                    const configSlot = Object.values(this.config.SLOTS).find((slot) => slot[slotId]);
                    const currSlotImg = configSlot[slotId][slotIndex].img;
                    const currSlotFilter = configSlot[slotId][slotIndex].filter;
                    const currSlotSimpleFilter = configSlot[slotId][slotIndex].simpleFilter;
                    const data = await new FormBuilder()
                        .file({name: "img", label: `${MODULE_ID}.app.paper-doll-global-config.img`, value: currSlotImg, type: "image"})
                        .multiSelect({name: "simpleFilter", label: `${MODULE_ID}.app.paper-doll-global-config.simpleFilter.label`, hint: `${MODULE_ID}.app.paper-doll-global-config.simpleFilter.hint`, value: currSlotSimpleFilter, options: CONFIG.Item.typeLabels})
                        .text({name: "filter", label: `${MODULE_ID}.app.paper-doll-global-config.filter.label`, hint: `${MODULE_ID}.app.paper-doll-global-config.filter.hint`, value: currSlotFilter})
                        .render(true);
                    if (!data) return;
                    configSlot[slotId][slotIndex].img = data.img;
                    configSlot[slotId][slotIndex].filter = data.filter;
                    await setSetting("globalConfig", this.config);
                    return this.render();
                });
                slot.addEventListener("contextmenu", (event) => {
                    const slotId = event.currentTarget.dataset.id;
                    const slotIndex = event.currentTarget.dataset.index;
                    this.removeSlot(slotId, slotIndex);
                });
            }
        });

        html.querySelectorAll("input").forEach((input) => {
            input.addEventListener("change", (event) => {
                this.saveOtherSettings();
            });
        });
    }

    async saveOtherSettings() {
        const inputs = Array.from(this.element[0].querySelectorAll("input"));
        for (const input of inputs) {
            const key = input.name;
            const value = input.value;
            this.config[key] = value;
        }
        await setSetting("globalConfig", this.config);
    }

    setPendantMargin() {
        const pendants = this.element[0].querySelectorAll(".paper-doll-slot[data-id='PENDANT']");
        if (!pendants.length) return;
        const first = pendants[0];
        const last = pendants[pendants.length - 1];
        first.style.marginTop = "calc(var(--paper-doll-flex-gap) * 4)";
        last.style.marginBottom = "calc(var(--paper-doll-flex-gap) * 4)";
    }

    async addSlot(key) {
        const configSlot = Object.values(this.config.SLOTS).find((slot) => slot[key]);
        const slot0img = configSlot[key][0]?.img ?? Object.values(DEFAULTS.SLOTS).find((slot) => slot[key])[key][0].img ?? "";
        const slot = {
            img: slot0img,
        };
        configSlot[key].push(slot);
        await setSetting("globalConfig", this.config);
        return this.render();
    }

    async removeSlot(key, index) {
        const configSlot = Object.values(this.config.SLOTS).find((slot) => slot[key]);
        configSlot[key].splice(index, 1);
        await setSetting("globalConfig", this.config);
        return this.render();
    }

    async close() {
        this.saveOtherSettings();
        return super.close();
    }
}
