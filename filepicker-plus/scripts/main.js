import { _onDrop } from "./advancedFileDrop.js";

const debounceInjectFilePickerPlus = foundry.utils.debounce(injectFilePickerPlus, 100);

class FilePickerPlusSidebar extends FilePicker {
    constructor(...args) {
        super(...args);
        Hooks.on("dropCanvasData", (event, data, a) => {
            if (data.type == "AmbientSound") {
                const soundData = {
                    path: data.path,
                    x: data.x,
                    y: data.y,
                    radius: data.radius / 2,
                };
                return canvas.scene.createEmbeddedDocuments("AmbientSound", [soundData]);
            } else if (data.type == "Token") {
                const pos = canvas.grid.getTopLeft(data.x, data.y);
                data.x = pos[0];
                data.y = pos[1];
                data.hidden = Array.from(game.keyboard.downKeys).some((k) => k.toLowerCase().includes("alt"));
                return canvas.scene.createEmbeddedDocuments("Token", [data]);
            }
        });
    }

    activateListeners(...args) {
        super.activateListeners(...args);
        this.element[0].classList.add("filepickerplussidebar");
    }

    _canDragStart(selector) {
        return game.user?.isGM;
    }

    _onDragStart(event) {
        const li = event.currentTarget;
        const placeastoken = game.settings.get("filepicker-plus", "placeastokens");
        // Get the tile size ratio
        const tileSize = parseInt(li.closest("form").tileSize.value) || canvas.dimensions.size;
        FilePickerPlusSidebar.LAST_TILE_SIZE = tileSize;
        const ratio = canvas.dimensions.size / tileSize;

        // Set drag data
        let dragData = {
            type: "Tile",
            texture: { src: li.dataset.path },
            tileSize,
        };
        let embeddedName = canvas.activeLayer.options.objectClass.embeddedName;
        if (embeddedName === "Token" && !placeastoken) embeddedName = "Tile";
        switch (embeddedName) {
            case "AmbientSound":
                dragData = {
                    type: "AmbientSound",
                    path: li.dataset.path,
                    radius: tileSize,
                };
                break;
            case "Tile":
                dragData = {
                    type: "Tile",
                    texture: { src: li.dataset.path },
                    tileSize,
                };
                break;
            case "Token":
                dragData = {
                    type: "Token",
                    texture: { src: li.dataset.path },
                    width: tileSize / canvas.scene.dimensions.size,
                    height: tileSize / canvas.scene.dimensions.size,
                };
                break;
        }
        event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

        // Create the drag preview for the image
        const img = li.querySelector("img");
        const w = img.naturalWidth * ratio * canvas.stage.scale.x;
        const h = img.naturalHeight * ratio * canvas.stage.scale.y;
        const preview = DragDrop.createDragImage(img, w, h);
        event.dataTransfer.setDragImage(preview, w / 2, h / 2);
    }

    _onPick(...args) {
        const res = super._onPick(...args);
        const el = args[0].currentTarget;
        if (!this.focusInput.offsetParent) this.focusInput = null;
        if (this.focusInput && el.classList.contains("file")) {
            this.focusInput.value = el.dataset.path;
        }

        return res;
    }

    async _renderOuter(...args) {
        const oldActiveWindow = ui.activeWindow;
        const res = await super._renderOuter(...args);
        ui.activeWindow = oldActiveWindow;
        return res;
    }

    async _render(...args) {
        await super._render(...args);
        const searchInput = this.element.find("input[name='filter']");
        const tileSize = this.element.find(".form-group.tile-size");
        tileSize.before(searchInput);
    }

    async close(...args) {
        return;
    }
}

Hooks.on("renderFilePicker", injectFilePickerPlus);

Hooks.on("renderSidebar", (app, html, tabs, c) => {
    if (!game.settings.get("filepicker-plus", "sidebarFilepicker") || !game.user.isGM) return;
    html.find("#sidebar-tabs a[data-tab='playlists']").after(`
  <a class="item" data-tab="filepicker" data-tooltip="File Browser" alt="File Browser">
            <i class="fas fa-folder"></i>
  </a>
  `);
});

Hooks.on("ready", () => {
    libWrapper.register("filepicker-plus", "FilePicker.prototype._onDrop", _onDrop, "OVERRIDE");

    if (!game.user.isGM) return;
    if (!game.settings.get("filepicker-plus", "sidebarFilepicker")) return;
    const sidebarWidth = parseFloat(getComputedStyle(document.querySelector("#sidebar #sidebar-tabs")).getPropertyValue("--sidebar-tab-width").replace("px", "").trim());
    document.querySelector("#sidebar #sidebar-tabs").style.setProperty("--sidebar-tab-width", sidebarWidth - 2 + "px");
    const app = new FilePickerPlusSidebar({ isSidebar: true, displayMode: "tiles", tileSize: true });
    app.renderPopout = () => {
        new FilePicker({ isSidebar: false, displayMode: "tiles", tileSize: true }).render(true);
    };
    app.render(true);
    app.tabName = "filepicker";
    setTimeout(() => {
        for (let [k, v] of Object.entries(ui.windows)) {
            if (v instanceof FilePickerPlusSidebar && v.options.isSidebar) {
                delete ui.windows[k];
            }
        }
    }, 1000);
    ui.filepicker = app;
    $(document).on("focus", "input[type='text']", (e) => {
        ui.filepicker.focusInput = e.target;
    });
});

Hooks.on("activateTilesLayer", () => {
    ui.filepicker?.render(true);
});

$(document).on("click", "#sidebar .item", (e) => {
    const tab = e.currentTarget.dataset.tab;
    const fp = ui.filepicker;
    const el = fp?.element?.closest(".app");
    if (!el) return;
    if (tab === "filepicker") {
        if (!ui.filepicker._firstRefresh) {
            ui.filepicker.render(true);
            ui.filepicker._firstRefresh = true;
        }
        el.show();
    } else {
        el.hide();
    }
});

function injectFilePickerPlus(app, html, options) {
    if (html.find(".fp-plus-injected").length) return;
    html.closest(".app")[0].style.width = null;
    const isSidebar = app.options.isSidebar;
    if (game.settings.get("filepicker-plus", "enablecolortheme")) html.closest(".filepicker").addClass("fp-theme");
    if (isSidebar) {
        html.find(".tile-size label").text("Size");
        $("#sidebar").append(html.closest(".app"));
        if (ui.sidebarFilePickerDirectoryExpanded) {
            html.find(".directory.folders-list").addClass("expanded");
            const hasFiles = html.find(".file").length > 0;
            if (hasFiles) {
                setTimeout(() => {
                    html.find(".directory.folders-list").removeClass("expanded");
                }, 100);
            }
        }
        if (!$("#sidebar .item[data-tab='filepicker']").hasClass("active")) {
            html.closest(".app").hide();
        } else {
            html.closest(".app").show();
        }
    }
    html.append(`<div class="fp-plus-injected" style="display:none"></div>`);
    const tilesize = html.find(".tile-size");
    if (tilesize.length) {
        html.find(".tile-size").after(html.find(".current-dir"));
        html.find(".tile-size").append(html.find(".display-modes"));
    } else {
        html.find(".favorites").after(html.find(".current-dir"));
        html.find(".current-dir .form-fields").after(html.find(".display-modes"));
    }
    html.find(".current-dir").after(html.find(".tile-size"));
    html.find('input[name="target"]').after(html.find('input[name="filter"]'));
    html.find('input[name="target"]').closest(".form-fields").css({
        position: "relative",
    });
    if (!html.find(".files-list").length) {
        html.find(".folders-list").addClass("expanded");
    }
    const offsetH = html.find(`input[name="file"]`).length ? 40 : 5;
    html.find(".filepicker-body").css({
        height: `calc(100% - ${isSidebar ? "30px" : "0px"} - ${html.find(".filepicker-header").height()}px - ${html.find(".filepicker-footer").height()}px - ${offsetH}px)`,
    });
    html.find(".filter-dir").next().remove();
    setTimeout(() => {
        html.find(".file").each((i, el) => {
            const src = el.dataset.path;
            const ext = src.split(".").pop();
            if (ext == "glb" || ext == "gltf") {
                const filename = src.split("/").pop();
                const img = $(el).find("img")[0];
                if (img) {
                    img.src = src.replace(ext, "webp");
                    img.style.display = "none";
                }
                $(el).append(`<div class="glb-preview" title="${filename}" style="background-image: url('${src.replace(ext, "webp")}')" data-path="${src}"><i class="fas fa-cube"></i></div>`);
                el.dataset.imagePreview = src.replace(ext, "webp");
            }
        });
    }, 100);
}

$(document).on("mouseenter", "#sidebar .directory.folders-list", (event) => {
    ui.sidebarFilePickerDirectoryExpanded = true;
});

$(document).on("mouseleave", "#sidebar .directory.folders-list", (event) => {
    ui.sidebarFilePickerDirectoryExpanded = false;
    $(event.currentTarget).removeClass("expanded");
});

$(document).on("click", "#sidebar .filepicker-header .item", (event) => {
    ui.filepicker.element.closest(".app").show();
});

Hooks.on("getFilePickerHeaderButtons", (app, buttons) => {
    if (!game.modules.get("three-actor-portrait")?.active) return;

    buttons.unshift({
        label: "Generate 3D Thumbnails",
        class: "thumb3d",
        icon: "fas fa-image",
        onclick: async (event) => {
            new Dialog(
                {
                    title: `Generate 3D Thumbnails`,
                    content: `<p>Generating 3D Thumbnails for <strong>${app.target}</strong>.</p>
        <p>If you experience crashing, it can happen (especially with large assets), simply run the command again and it will resume where it left off.</p>
        <p>This operation has high memory usage, it's recommended to refresh with CTRL+F5 after the generation is done to purge the memory.</p>
        <hr>
        <div class="form-group" style="display: flex;
        justify-content: space-between;
        align-items: center;">
            <label>Create Top-Down version</label>
            <input type="checkbox" name="topdown">
        </div>
        <hr>
        `,
                    buttons: {
                        normal: {
                            icon: '<i class="fas fa-folder fa-fw"></i>',
                            label: "This Folder Only",
                            callback: async (html) => {
                                const isTopDown = html.find("input[name='topdown']").is(":checked");
                                await game.threeportrait.ThreePortraitPreview.generateThumbnails(app.target, true, false, app.activeSource);
                                if (isTopDown) await game.threeportrait.ThreePortraitPreview.generateThumbnails(app.target, true, false, app.activeSource, true);
                            },
                        },
                        recursive: {
                            icon: '<i class="fas fa-folder-open"></i>',
                            label: "Folder and Subfolders",
                            callback: async (html) => {
                                const isTopDown = html.find("input[name='topdown']").is(":checked");
                                await game.threeportrait.ThreePortraitPreview.generateThumbnails(app.target, true, true, app.activeSource);
                                if (isTopDown) await game.threeportrait.ThreePortraitPreview.generateThumbnails(app.target, true, true, app.activeSource, true);
                            },
                        },
                    },
                    default: "normal",
                },
                {
                    width: 400,
                },
            ).render(true);
        },
    });
});

let FilePickerPlusAudioHelper = {};
let FilePickerPlusThreePreview = null;

//display a tooltip when hovering a file
$(document).on("mouseenter", ".file", async function (e) {
    const fp = $(e.currentTarget).closest(".filepicker");
    const isSidebar = fp.closest("#sidebar").length > 0;
    $(e.currentTarget).addClass("filepicker-plus-hover");
    let event = e;
    try {
        const imgPath = e.currentTarget.dataset.imagePreview || $(e.currentTarget).data("path");
        const extension = "." + imgPath.split(".").pop();
        const ext = FilePickerPlusExtensions;
        const isImage = ext.img.includes(extension);
        const isVideo = ext.vid.includes(extension);
        const isAudio = ext.aud.includes(extension);
        const isThree = ext.three.includes(extension);
        if (isAudio && game.settings.get("filepicker-plus", "audiopreview")) {
            for (let [k, v] of Object.entries(FilePickerPlusAudioHelper)) {
                v?.stop();
            }
            setTimeout(async () => {
                if (!$(e.currentTarget).hasClass("filepicker-plus-hover")) return;
                FilePickerPlusAudioHelper[foundry.utils.randomID(20)] = await foundry.audio.AudioHelper.play({
                    src: imgPath,
                    loop: true,
                    volume: game.settings.get("filepicker-plus", "audiopreviewvol"),
                });
            }, game.settings.get("filepicker-plus", "audiopreviewdelay"));

            if (!$(".filepicker").length) {
                for (let [k, v] of Object.entries(FilePickerPlusAudioHelper)) {
                    v.stop();
                    delete FilePickerPlusAudioHelper[k];
                }
            }
        }
        if (isThree && game.settings.get("filepicker-plus", "threepreview") && game.modules.get("three-actor-portrait")?.active) {
            let $tooltip = $(`
    <div class="filepicker-plus-tooltip isthree" style="width:${window.innerWidth * 0.2}px !important; height:${window.innerWidth * 0.2}px !important; max-width:${window.innerWidth * 0.2}px !important; max-height:${window.innerWidth * 0.2}px !important">
      <div class="filepicker-plus-three">Loading...</div>
    </div>
    `);
            if (!isSidebar) {
                $tooltip.css({
                    left: -fp.offset().left + 10,
                    top: -fp.offset().top + 10,
                });
            }
            setTimeout(() => {
                if (!$(e.currentTarget).hasClass("filepicker-plus-hover")) return;
                (isSidebar ? $(document.body) : fp).append($tooltip);
                if (FilePickerPlusThreePreview) {
                    FilePickerPlusThreePreview.destroy(0);
                    FilePickerPlusThreePreview = null;
                }
                FilePickerPlusThreePreview = new game.threeportrait.ThreePortraitPreview(null, $tooltip.find(".filepicker-plus-three"), { preventAutoDispose: true, gltf: imgPath });
            }, 250);
        }
        if (!isImage && !isVideo) return;
        if (!game.settings.get("filepicker-plus", "imagepreview")) return;
        let $tooltip = $(`
  <div class="filepicker-plus-tooltip">
  <span class="filepicker-plus-dimensions"></span>
      ${isVideo ? "<video crossorigin=anonymous " : "<img"} class="filepicker-plus-file-icon" autoplay loop src="${imgPath}">${isVideo ? "</video>" : ""}
  </div>
  `);

        //get image or video dimensions
        const imgOrVideo = $tooltip.find("img, video")[0];
        let dimensions = { width: 0, height: 0 };
        const setDimensionsTooltip = () => {
            $tooltip.find(".filepicker-plus-dimensions").text(`${dimensions.width}x${dimensions.height}`);
        };
        imgOrVideo.onload = function () {
            dimensions = { width: this.naturalWidth || this.videoWidth, height: this.naturalHeight || this.videoHeight };
            setDimensionsTooltip();
        };
        //handle metadata loaded
        imgOrVideo.onloadedmetadata = function () {
            dimensions = { width: this.naturalWidth || this.videoWidth, height: this.naturalHeight || this.videoHeight };
            setDimensionsTooltip();
        };
        //handle the case where the image or video is already loaded
        if (imgOrVideo.complete) {
            dimensions = { width: this.naturalWidth || this.videoWidth, height: this.naturalHeight || this.videoHeight };
            setDimensionsTooltip();
        }

        if (!isSidebar) {
            $tooltip.css({
                left: -fp.offset().left + 10,
                top: -fp.offset().top + 10,
            });
            fp.append($tooltip);
        } else {
            $("body").append($tooltip);
        }
    } catch (err) {
        for (let [k, v] of Object.entries(FilePickerPlusAudioHelper)) {
            v?.stop();
            //delete FilePickerPlusAudioHelper[k];
        }
    }
});

$(document).on("click", ".filepicker .header-button.close", function (e) {
    function clearFP() {
        for (let [k, v] of Object.entries(FilePickerPlusAudioHelper)) {
            v.stop();
            delete FilePickerPlusAudioHelper[k];
        }
        const currentFP = $(".filepicker-plus-tooltip");
        currentFP.removeClass("filepicker-plus-hover");
        if (FilePickerPlusThreePreview) {
            FilePickerPlusThreePreview.destroy(0);
            FilePickerPlusThreePreview = null;
        }
        currentFP.fadeOut(300, function () {
            currentFP.remove();
        });
        setTimeout(() => {
            $(".filepicker-plus-tooltip").remove();
        }, 1000);
    }

    clearFP();
    setTimeout(() => {
        clearFP();
    }, 1000);
});

//remove the tooltip when the mouse leaves the file
$(document).on("mouseleave", ".file", function (e) {
    $(e.currentTarget).removeClass("filepicker-plus-hover");
    for (let [k, v] of Object.entries(FilePickerPlusAudioHelper)) {
        v.stop();
        delete FilePickerPlusAudioHelper[k];
    }
    const currentFP = $(".filepicker-plus-tooltip");
    if (FilePickerPlusThreePreview) {
        FilePickerPlusThreePreview.destroy(0);
        FilePickerPlusThreePreview = null;
    }
    currentFP.fadeOut(300, function () {
        currentFP.remove();
    });
});

$(document).on("contextmenu", ".file", function (e) {
    const fileName = $(e.currentTarget).data("path");
    navigator.clipboard.writeText(fileName);
    ui.notifications.info(`'${fileName}'' copied to clipboard`);
});

$(document).on("click", ".filepicker .header-button", (e) => {
    for (let [k, v] of Object.entries(FilePickerPlusAudioHelper)) {
        v.stop();
        delete FilePickerPlusAudioHelper[k];
    }
    $(".filepicker-plus-tooltip").remove();
});
const FilePickerPlusExtensions = {
    img: [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG", ".svg", ".SVG", ".webp", ".WEBP"],
    vid: [".mp4", ".MP4", ".webm", ".WEBM", ".m4v", ".M4V"],
    aud: [".flac", ".FLAC", ".m4a", ".M4A", ".mp3", ".MP3", ".ogg", ".OGG", ".opus", ".OPUS", ".wav", ".WAV"],
    three: [".glb", ".GLB", ".gltf", ".GLTF"],
};

async function journalToText(uuid) {
    const journal = await fromUuid(uuid);
    const pages = Array.from(journal.pages);
    let text = "";
    for (let page of pages) {
        const html = await TextEditor.enrichHTML(page.text.content);
        const div = document.createElement("div");
        div.innerHTML = html;
        text += div.innerText;
    }
    return text;
}
