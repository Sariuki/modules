import { MODULE_ID } from "./main.js";
import {getSetting} from "./settings.js";

const _onClickEntryName = async function (wrapped, ...args) {
    if(!getSetting("clickViewScene")) return wrapped(...args);
    const [event] = args;
    event.preventDefault();
    const element = event.currentTarget;
    const documentId = element.parentElement.dataset.documentId;
    const document = this.collection.get(documentId) ?? await this.collection.getDocument(documentId);
    document.view();
}

export function initConfig() {

    if (window.libWrapper) {        
        libWrapper.register(MODULE_ID, "SceneDirectory.prototype._onClickEntryName", _onClickEntryName, "MIXED");
    } else {
        const original = SceneDirectory.prototype._onClickEntryName;
        SceneDirectory.prototype._onClickEntryName = async function (...args) {
            return _onClickEntryName.bind(this)(original,...args);
        }
    }

}