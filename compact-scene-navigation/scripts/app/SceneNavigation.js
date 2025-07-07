import { MODULE_ID } from "../main";
import { getSetting, setSetting } from "../settings";

export class CompactSceneNavigation extends SceneNavigation {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: `modules/${MODULE_ID}/templates/navigation.hbs`,
        });
    }

    get scenes() {
        const scenes = game.user.isGM && !getSetting("useNavigation") ? Array.from(game.scenes) : super.scenes;
        scenes.sort((a, b) => a.navOrder - b.navOrder);
        const dynamicSorting = getSetting("dynamicSorting");
        if(!dynamicSorting) return scenes;
        const scenesNoViewNoActive = scenes.filter((s) => !(s.isView || s.active))
        const activeScenes = scenes.filter((s) => s.active);
        const viewScenes = scenes.filter((s) => s.isView && !s.active);
        return activeScenes.concat(viewScenes).concat(scenesNoViewNoActive);
    }

    getFolders(sceneList) {
        sceneList ??= this.scenes;
        const sceneFolders = Array.from(game.folders)
            .filter((f) => f.type === "Scene")
            .filter((f) => sceneList.some((s) => s.folder === f));
        const finalFolders = new Set(sceneFolders);
        sceneFolders.forEach((f) => {
            f.ancestors.forEach((a) => finalFolders.add(a));
        });
        return Array.from(finalFolders);
    }

    async getData() {
        const sceneList = this.scenes;
        const sceneFolders = this.getFolders(sceneList);
        const rootFolders = sceneFolders.filter((f) => f.folder === null);
        const path = getSetting("path");
        const pathFolders = path
            .map((uuid) => fromUuidSync(uuid))
            .map((f, index) => {
                if (!f) return null;
                const isLast = index === path.length - 1;
                return {
                    name: f.name,
                    color: f.color ?? "black",
                    uuid: f.uuid,
                    children: sceneFolders.filter((s) => s.folder === f),
                    style: isLast ? "border-bottom-left-radius: 0; border-top-left-radius: 0;" : "border-radius: 0; margin-right: 0;",
                };
            })
            .filter((f) => f);
        //add root pseudo folder
        pathFolders.unshift({
            name: `<i class="fa-duotone fa-folder-tree"></i>`,
            color: "black",
            uuid: undefined,
            isRoot: true,
            children: rootFolders,
            style: "margin-right: 0; border-radius: 0;",
        });
        const currentFolder = pathFolders[pathFolders.length - 1];
        if (pathFolders.length === 1) currentFolder.style = "";
        this._currentFolder = currentFolder;

        const scenes = sceneList
            .map((scene) => {
                const inFolderView = scene.folder?.uuid != currentFolder.uuid;

                const users = game.users.reduce((arr, u) => {
                    if (u.active && u.viewedScene === scene.id) arr.push({ letter: u.name[0], color: u.color });
                    return arr;
                }, []);

                if (inFolderView && !scene.isView && !scene.active && !users.length) return null;
                return {
                    id: scene.id,
                    active: scene.active,
                    name: TextEditor.truncateText(scene.navName || scene.name, { maxLength: 32 }),
                    tooltip: scene.navName && game.user.isGM ? scene.name : null,
                    users,
                    visible: game.user.isGM || scene.isOwner || scene.active,
                    css: [scene.isView ? "view" : null, scene.active ? "active" : null, scene.ownership.default === 0 ? "gm" : null].filterJoin(" "),
                };
            })
            .filter((s) => s !== null);

        return { scenes, path: pathFolders, collapsed: false };
    }

    createFolderContext(html) {
        const sceneFolders = this.getFolders();
        const buttons = sceneFolders.map((f) => {
            return {
                name: f.name,
                icon: '<i class="fas fa-folder"></i>',
                condition: (i) => {
                    i = i[0] ?? i;
                    const folder = fromUuidSync(i.dataset.uuid);
                    if (!folder) return f.folder === null;
                    return f.folder === folder;
                },
                callback: (i) => {
                    setPathFromFolder(f);
                },
            };
        });
        new ContextMenu(html, "li .siblings", buttons, { eventName: "click" });
    }

    createFavoritesContext(html) {
        const favorites = game.user.getFlag(MODULE_ID, "favorites") ?? [];
        const scenes = favorites.map((f) => game.scenes.get(f)).filter((s) => s);
        const buttons = scenes.map((s) => {
            return {
                name: s.name,
                icon: '<i class="fas fa-star"></i>',
                callback: () => {
                    s.view();
                },
            };
        });
        new ContextMenu(html, "li .favorites", buttons, { eventName: "click" });
    }

    _getContextMenuOptions(...args) {
        const options = super._getContextMenuOptions(...args);
        options.push(
            {
                name: `${MODULE_ID}.ToggleFavorite`,
                icon: '<i class="fas fa-star"></i>',
                callback: async (i) => {
                    i = i[0] ?? i;
                    const scene = game.scenes.get(i.dataset.sceneId);
                    const favorites = game.user.getFlag(MODULE_ID, "favorites") ?? [];
                    if (favorites.includes(scene.id))
                        await game.user.setFlag(
                            MODULE_ID,
                            "favorites",
                            favorites.filter((f) => f !== scene.id),
                        );
                    else await game.user.setFlag(MODULE_ID, "favorites", [...favorites, scene.id]);
                    this.render(true);
                },
            },
            {
                name: `${MODULE_ID}.goToFolder`,
                icon: '<i class="fas fa-folder"></i>',
                condition: (i) => {
                    i = i[0] ?? i;
                    const scene = game.scenes.get(i.dataset.sceneId);
                    const folder = scene.folder;
                    return folder?.uuid !== this._currentFolder.uuid;
                },
                callback: (i) => {
                    i = i[0] ?? i;
                    const scene = game.scenes.get(i.dataset.sceneId);
                    setPathFromFolder(scene.folder?.uuid);
                },
            },
        );
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        this.createFolderContext(html);
        this.createFavoritesContext(html);
        html.querySelectorAll(".folder .scene-name:not(.favorites)").forEach((scene) => {
            scene.addEventListener("click", this._onClickScene.bind(this));
        });

        if (getSetting("autoHide")) html.classList.add("auto-hide");
    }

    _onClickScene(event) {
        event.preventDefault();
        if (event.currentTarget.closest(".siblings")) return;
        const sceneId = event.currentTarget.dataset.sceneId;
        const folderUuid = event.currentTarget.dataset.folder;
        if (folderUuid) return setPathFromFolder(folderUuid);
        game.scenes.get(sceneId).view();
    }
}

function setPathFromFolder(folder) {
    folder ??= "root";
    if (folder === "root") return setSetting("path", []);
    folder = typeof folder === "string" ? fromUuidSync(folder) : folder;
    const path = [folder];
    let currentFolder = folder;
    while (currentFolder.folder) {
        currentFolder = currentFolder.folder;
        path.unshift(currentFolder);
    }
    console.log(path);
    setSetting(
        "path",
        path.map((f) => f.uuid),
    );
}
