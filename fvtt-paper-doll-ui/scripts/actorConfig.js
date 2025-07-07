import { MODULE_ID, CONSTS } from "./main";

import { getSetting, setSetting } from "./settings";

export class ActorConfig extends FormApplication {
    constructor(object) {
        super();
        this.object = object;
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "paper-doll-actor-config",
            title: game.i18n.localize(`${MODULE_ID}.app.actor-config.title`),
            template: `modules/${MODULE_ID}/templates/actor-config.hbs`,
            width: 400,
            height: "auto",
            closeOnSubmit: true,
            submitOnClose: false,
        });
    }

    getData() {
        return this.object;
    }

    _updateObject(event, data) {
        event.preventDefault();
        data = foundry.utils.expandObject(data);
        this.object.update(data);
    }
}
