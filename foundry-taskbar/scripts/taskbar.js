class Taskbar {
    constructor() {
        this.buttons = [];
        this.enableplayers = game.settings.get("foundry-taskbar", "enableplayers");
        this.settings = game.user.getFlag("foundry-taskbar", "taskbarSettings"); //game.settings.get("foundry-taskbar", "taskbarSettings");
        this.isGM = game.user.isGM;
        $("body").find("#taskbar").remove();
        $("body").find("#start-menu").remove();
        if (this.enableplayers) {
            this.init();
        } else {
            if (game.user.isGM) this.init();
        }
    }

    init() {
        let $taskbar = $(`
        <div class="taskbar-workspaces">
          <div id="add-workspace">
            <i id="workspace-btn" class="fas fa-plus"></i>
          </div>
          <ol class="start-menu-workspaces"></ol>
        </div>
        <div class="taskbar-docking-container locked"></div>
        <div class="taskbar locked" id="taskbar">
          <div class="start-menu-btn"></div>
          <div class="taskbar-items"></div>
          <div class="taskbar-tray">
            <i id="workspace-btn" class="fas fa-chevron-up"></i>
            <i id="lock-btn" class="fas fa-lock"></i>
            <i id="modules-btn" class="fas fa-cogs" data-action="modules-settings"></i>
            <i id="close-btn" class="fas fa-window-close"></i>
            <i id="fps-btn" class="fas fa-chart-bar"></i>
          </div>
          <div id="taskbar-showdesktop"></div>
          <div class="start-menu" id="start-menu">
            <div class="start-menu-options">
                <div class="start-menu-option" title="expand">
                  <i class="fas fa-bars"></i> START
                </div>
                <div class="start-menu-option" title="User Management" onclick="ui.menu.items.players.onClick();">
                  <i class="far fa-user-circle"></i> User Management
                </div>
                <div class="start-menu-option" data-action="modules-settings" title="Module Settings">
                  <i class="fas fa-cog"></i> Module Settings
                </div>
                <div class="start-menu-option" title="Macro Directory" onclick="ui.macros.renderPopout(true);">
                  <i class="fas fa-code"></i> Macro Directory
                </div>
                
                <div class="start-menu-option" title="Refresh Foundry" onclick="window.location.reload();">
                  <i class="fas fa-sync-alt"></i> Refresh Foundry
                </div>
                <div class="start-menu-option" title="Log Out" onclick="ui.menu.items.logout.onClick();">
                  <i class="fas fa-sign-out-alt"></i> Log Out
                </div>
            </div>
            <ol class="start-menu-items"></ol>
            <ol class="start-menu-apps"></ol>
          </div>
        </div>
        `);

        this.element = $taskbar;
        this.startMenu = $($taskbar.find("#start-menu"));
        $("body").append(this.element);
        $(".taskbar-workspaces").fadeToggle();

        // Dock Player List
        if (game.settings.get("foundry-taskbar", "dockPlayersList")) this.dockPlayerList();
        if (game.settings.get("foundry-taskbar", "dockMacroBar")) this.dockMacroBar();

        if (game.modules.get("spotlight-omnisearch")?.active ?? false) this.supportForOmnisearch();
        else if (game.modules.get("quick-insert")?.active ?? false) this.supportForQuickInsert();

        this.addTrayButtons();
        this.loadSettings($taskbar);
        this.activateListeners($taskbar);
    }

    supportForQuickInsert() {
        $("#taskbar .start-menu-btn").after(`<aside id="taskbarQuickInsert"><h3><i class="fas fa-search"></i></h3>`);

        // Stupid hooks for Stupid Active Logic
        Hooks.on("renderApplication", (app, html, options) => {
            if ($(html).hasClass("quick-insert-app")) $("#taskbar #taskbarQuickInsert").addClass("active");
        });
        Hooks.on("closeApplication", (app, html) => {
            if ($(html).hasClass("quick-insert-app")) $("#taskbar #taskbarQuickInsert").removelass("active");
        });

        $("#taskbar #taskbarQuickInsert").on("click", (event) => {
            QuickInsert.open({
                spawnCSS: {
                    left: $("#taskbar #taskbarQuickInsert").offset().left,
                    bottom: 50,
                },
                onSubmit: (item) => {
                    item.show();
                },
                onClose: () => {
                    $("#taskbar #taskbarQuickInsert").removeClass("active");
                },
            });
        });
    }

    supportForOmnisearch() {
        $("#taskbar .start-menu-btn").after(`<aside id="taskbarQuickInsert"><h3><i class="fas fa-search"></i></h3>`);

        $("#taskbar #taskbarQuickInsert").on("click", (event) => {
            new CONFIG.SpotlightOmniseach.app.toTaskbar({
                left: $("#taskbar #taskbarQuickInsert").offset().left,
                bottom: 50,
            });
        });
    }

    dockPlayerList() {
        if (game.modules.get("smalltime")?.active) game.settings.set("smalltime", "pinned", false);
        $("#taskbar .start-menu-btn").after($("#players"));
        $("#players").addClass("hide-players");

        Hooks.on("renderPlayerList", (PlayerList, element, data) => {
            $("#taskbar .start-menu-btn").after($("#players"));

            $("#players").toggleClass("hide-players", !data.showOffline);

            if (!game.settings.get("foundry-taskbar", "showOfflinePlayersInDockedMode")) {
                $("#players .player .player-active.inactive").closest("li").remove();
            }
        });
    }

    dockMacroBar() {
        /*
    vars to set
        --hotbar-height: 42px;
    --hotbar-width: auto;
    --macro-size: 42px;
    */
        $("#taskbar .taskbar-tray").prepend($("#hotbar"));

        Hooks.on("renderHotbar", (app, html) => {
            $("#taskbar .taskbar-tray").prepend($("#hotbar"));
        });

        document.documentElement.style.setProperty("--hotbar-height", "42px");
        document.documentElement.style.setProperty("--hotbar-width", "auto");
        document.documentElement.style.setProperty("--macro-size", "42px");
    }

    //
    addTrayButtons() {
        let buttons = [];
        if (game.modules.get("gm-screen")?.active && this.isGM) {
            buttons.push({
                id: "gm-screen",
                icon: "fas fa-book-reader",
                onClick: (e) => {
                    $("body").find(`button[data-action="toggle-gm-screen"]`).click();
                },
            });
        }
        if (game.modules.get("smalltime")?.active) {
            buttons.push({
                id: "smalltime",
                icon: "fas fa-adjust",
                onClick: (e) => {
                    game.settings.set("smalltime", "pinned", false);
                    const $smalltime = $("#smalltime-app");
                    if ($smalltime.length > 0) {
                        if ($smalltime.closest(".taskbar").length > 0) {
                            $("body").append($smalltime);
                        } else {
                            $(".taskbar-tray").prepend($smalltime);
                        }
                    }
                },
            });
        }
        Hooks.call("getTaskbarButtons", buttons);

        let extraButtons = ``;

        for (let button of buttons) {
            extraButtons += `<i id="${button.id}-btn" class="${button.icon}"></i>`;
            this.element.on("click", `#${button.id}-btn`, button.onClick);
        }

        this.element.find(".taskbar-tray").find("#workspace-btn").after(extraButtons);
    }

    activateListeners(html) {
        const _this = this;

        this.element.on("click", "#taskbar-showdesktop", () => {
            $(".taskbar-item").click();
        });

        html.on("click", ".window-header", (e) => {
            $("body").append($(e.currentTarget).closest("[data-appid]"));
            const appId = $(e.currentTarget).closest("[data-appid]")[0].dataset.appid;
            ui.windows[appId].maximize();
        });
        html.on("click", "#lock-btn", (e) => {
            html.toggleClass("locked");
            html.hasClass("locked") ? $(e.currentTarget).removeClass("fa-unlock").addClass("fa-lock") : $(e.currentTarget).removeClass("fa-lock").addClass("fa-unlock");
            _this.updateSettings("locked", html.hasClass("locked"));
        });
        html.on("click", "#workspace-btn", (e) => {
            html.toggleClass("force-locked");
            const btn = $(e.currentTarget);
            const offset = btn.offset();
            const btnWidth = btn.outerWidth();
            const workspaceWidth = $(".taskbar-workspaces").outerWidth();
            const left = offset.left + btnWidth / 2 - workspaceWidth / 2;
            $(".taskbar-workspaces").css({
                left: left,
            });
            $(".taskbar-workspaces").fadeToggle(50);
        });
        html.on("click", `[data-action="modules-settings"]`, async (e) => {
            await game.settings.sheet._render(true);
            Object.values(ui.windows)
                .find((w) => w.id === "client-settings")
                ?.element.find(`a[data-tab="modules"]`)[0]
                ?.click();
        });
        html.on("click", "#close-btn", async (e) => {
            Dialog.confirm({
                title: "Close all windows",
                content: "Are you sure you want to close all open windows?",
                yes: () => {
                    Object.values(ui.windows).forEach((w) => {
                        w.close();
                    });
                },
                no: () => {},
                defaultYes: false,
            });
        });
        html.on("click", ".start-menu-btn", (e) => {
            $(".start-menu").toggleClass("active");
            html.toggleClass("force-locked");
        });
        html.on("drop", ".start-menu-items", (e) => {
            let data;
            try {
                data = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
            } catch (e) {}
            if (!data) return;
            _this.addToList(data).then(() => {
                _this.saveStartMenu();
            });
        });
        html.on("drop", ".start-menu-apps", (e) => {
            let data;
            try {
                data = JSON.parse(e.originalEvent.dataTransfer.getData("text/plain"));
            } catch (e) {}
            if (!data) return;
            _this.addToAppList(data).then(() => {
                _this.saveStartMenu();
            });
        });
        html.on("click", ".start-menu-item span, .start-menu-item img", async (e) => {
            //get data
            const elem = $(e.currentTarget).closest(".start-menu-item");
            const uuid = elem.data("uuid");
            const entity = await fromUuid(uuid);
            entity.sheet.render(true);
        });
        html.on("mouseup", ".start-menu-app", (e) => {
            //get data
            switch (e.which) {
                case 1:
                    const elem = $(e.currentTarget).closest(".start-menu-app");
                    const uuid = elem.data("uuid");
                    fromUuid(uuid).then((entity) => {
                        entity.execute();
                    });
                    break;
                case 3:
                    $(e.currentTarget).remove();
                    _this.saveStartMenu();
                    break;
            }
        });
        this.element.on("click", ".start-menu-workspace", (e) => {
            const data = JSON.parse($(e.currentTarget).data("workspace").replaceAll("|", `"`));
            if (e.shiftKey)
                Object.values(ui.windows).forEach((w) => {
                    if (!data.some((a) => a.id == w.document?.id) && w.document) w.close();
                });
            for (let app of data) {
                const isCompendium = app.documentName === "Compendium";
                if (isCompendium) {
                    const pack = game.packs.get(app.id);
                    if (pack) pack.render(true);
                } else {                    
                    const collection = game.collections.get(app.documentName);
                    const document = collection.get(app.id);
                    if (document) {
                        document.sheet.render(true);
                    }
                }
            }
        });
        this.element.on("contextmenu", ".start-menu-workspace", (e) => {
            $(e.currentTarget).remove();
            _this.saveStartMenu();
        });
        this.element.on("click", "#add-workspace", (e) => {
            Dialog.confirm({
                title: "Add workspace",
                content: `<form><div class="form-group">
        <label>Workspace Name</label>
        <div class="form-fields">
            <input type="text" name="name" placeholder="New Workspace" required="">
        </div>
    </div></form>`,
                yes: (html) => {
                    const name = html.find("input[name=name]").val();
                    if (name) _this.createWorkspace(name);
                },
                no: () => {},
                defaultYes: true,
            });
        });
        html.on("click", ".start-menu-item i", (e) => {
            e.preventDefault();
            $(e.currentTarget).closest(".start-menu-item").remove();
            _this.saveStartMenu();
        });

        $("#board").on("click", () => {
            $(".start-menu").removeClass("active");
            html.removeClass("force-locked");
            $(".taskbar-workspaces").fadeOut(50);
        });
        const fpsMeter = html.find("#fps-btn");
        fpsMeter.on("click", (e) => {
            $(e.currentTarget).toggleClass("fa-chart-bar");
        });
        const fpsMeterEl = fpsMeter[0];
        canvas.app.ticker.add(() => {
            if (!fpsMeter.hasClass("fa-chart-bar")) {
                let FPS = canvas.app.ticker.FPS.toFixed(0);
                if (fpsMeterEl.innerText != FPS) {
                    fpsMeterEl.innerText = FPS;
                }
            } else {
                fpsMeterEl.innerText = "";
            }
        });
        html.on("dragstart", ".start-menu-item", (event) => {
            const uuid = $(event.currentTarget).data("uuid");
            const type = $(event.currentTarget).data("type");
            event.originalEvent.dataTransfer.setData(
                "text/plain",
                JSON.stringify({
                    type: type,
                    uuid: uuid,
                }),
            );
        });

        // mimic start menu delay when hovering over items
        html.on("click", "#start-menu .start-menu-options .start-menu-option:first-child", (event) => {
            $(event.currentTarget).closest(".start-menu-options").toggleClass("expanded");
        });
        html.on("mouseenter", "#start-menu .start-menu-options", (event) => {
            let $startMenuOptions = $(event.currentTarget).closest(".start-menu-options");
            setTimeout(() => {
                $startMenuOptions.toggleClass("expanded", $startMenuOptions.is(":hover"));
            }, 1000);
        }).on("mouseleave", "#start-menu .start-menu-options.expanded", (event) => {
            let $startMenuOptions = $(event.currentTarget).closest(".start-menu-options");
            $(event.currentTarget).removeClass("expanded");
        });

        this.makeSortable(html.find(".start-menu-items")[0]);
        this.makeSortable(html.find(".start-menu-apps")[0]);
        this.makeSortable(html.find(".start-menu-workspaces")[0]);
        this.loadStartMenu();
    }

    makeSortable(el) {
        const _this = this;
        let itemCount = 0;
        Sortable.create(el, {
            animation: 150,
            removeCloneOnHide: true,
            onEnd: function (evt) {
                if (_this.element.find(".start-menu-item").length !== itemCount) _this.element.find(".start-menu-item").last().remove();
            },
            onChange: function (evt) {
                _this.saveStartMenu();
            },
            onStart: function (evt) {
                itemCount = _this.element.find(".start-menu-item").length;
            },
        });
    }

    loadSettings(html) {
        const settings = this.settings;
        //Handle locked
        html.toggleClass("locked", settings?.locked || false);
        html.hasClass("locked") ? html.find("#lock-btn").removeClass("fa-unlock").addClass("fa-lock") : html.find("#lock-btn").removeClass("fa-lock").addClass("fa-unlock");
        document.documentElement.style.setProperty("--ft-background-color", game.settings.get("foundry-taskbar", "taskbarColor"));
    }

    async addToList(data) {
        if (!data.uuid) data.uuid = `${data.type}.${data.id}`;
        const $ol = this.startMenu.find(".start-menu-items");
        const entity = await fromUuid(data.uuid);
        if (!entity) return;
        const $li = $(`<li class="start-menu-item" data-type="${data.type}" data-did="${data.id}" data-uuid="${data.uuid}">
        <img src="${entity.img || "modules/foundry-taskbar/assets/file.webp"}" alt="">
        <span>${entity.name}</span>
        <i class="fas fa-times"></i>
        <li>`);
        $ol.append($li);
    }

    async addToAppList(data) {
        if (!data.uuid) data.uuid = `${data.type}.${data.id}`;
        const $ol = this.startMenu.find(".start-menu-apps");
        if (data.type !== "Macro") return;
        const entity = await fromUuid(data.uuid); //game.collections.get(data.type).get(data.id);
        if (!entity) return;
        const $li = $(`<li class="start-menu-app" data-tooltip="${entity.name}" data-type="${data.type}" data-did="${data.id}" data-uuid="${data.uuid}">
        <img src="${entity.img}" alt="404">
      <li>`);
        $ol.append($li);
    }

    addWorkspace(data) {
        const $ol = $(".start-menu-workspaces");
        const $li = $(`<li class="start-menu-workspace" data-workspace="${data.data}">
      <span id="ws-name">${data.name}</span>
        </li>`);
        $ol.append($li);
    }

    createWorkspace(name) {
        const data = [];
        for (let window of Object.values(ui.windows)) {
            if (window instanceof Compendium) {
                data.push({
                    documentName: "Compendium",
                    id: window.collection.collection,
                });
            }
            if (!window.document?.documentName) continue;
            data.push({
                documentName: window.document.documentName,
                id: window.document.id,
            });
        }
        if (!data.length) return ui.notifications.error(`No windows to create workspace - only documents can be saved`);
        this.addWorkspace({ name: name, data: JSON.stringify(data).replaceAll(`"`, `|`) });
        this.saveStartMenu();
    }

    async saveStartMenu() {
        let data = [];
        let $ol = this.startMenu.find(".start-menu-items");
        $ol.find("li").each((i, el) => {
            if ($(el).data("uuid")) {
                data.push({
                    type: $(el).data("type"),
                    uuid: $(el).data("uuid"),
                });
            }
        });
        let appData = [];
        $ol = this.startMenu.find(".start-menu-apps");
        $ol.find("li").each((i, el) => {
            if ($(el).data("uuid")) {
                appData.push({
                    type: $(el).data("type"),
                    uuid: $(el).data("uuid"),
                });
            }
        });

        let workspaceData = [];
        $ol = $(".start-menu-workspaces");
        $ol.find("li").each((i, el) => {
            workspaceData.push({
                name: $(el).find("#ws-name").text(),
                data: $(el).data("workspace"),
            });
        });
        await this.updateSettings("startMenu", data);
        await this.updateSettings("appMenu", appData);
        await this.updateSettings("workspaceMenu", workspaceData);
    }

    loadStartMenu() {
        const settings = this.settings;
        if (settings?.startMenu) {
            const startMenu = settings.startMenu;
            startMenu.forEach((item) => {
                this.addToList(item);
            });
        }
        if (settings?.appMenu) {
            const appMenu = settings.appMenu;
            appMenu.forEach((item) => {
                this.addToAppList(item);
            });
        }
        if (settings?.workspaceMenu) {
            const workspaceMenu = settings.workspaceMenu;
            workspaceMenu.forEach((item) => {
                this.addWorkspace(item);
            });
        }
    }

    async updateSettings(key, value) {
        const oldSettings = game.user.getFlag("foundry-taskbar", "taskbarSettings");
        const newSettings = { ...oldSettings, [key]: value };
        this.settings = newSettings;
        await game.user.setFlag("foundry-taskbar", "taskbarSettings", newSettings);
    }

    static injectButtons(app, buttons) {
        if (!app.popOut || !app.options.minimizable) return;
        if (!game.settings.get("foundry-taskbar", "enableplayers") && !game.user.isGM) return;
        const closeIndex = buttons.indexOf(buttons.find((b) => b.class === "close"));
        buttons.splice(closeIndex, 0, {
            label: "",
            class: "send-to-taskbar",
            icon: "fas fa-window-minimize",
            onclick: () => {
                $(".taskbar-items").find(`div[data-tiappid="${app.appId}"]`).click();
            },
        });
    }

    static injectButtonsV2(app) {
        if (!app.hasFrame || !app.options.window.minimizable) return;
        if (!game.settings.get("foundry-taskbar", "enableplayers") && !game.user.isGM) return;
        const close = app.window.close;
        if(close.parentElement.querySelector(".header-control.fa-window-minimize")) return;
        //<button type="button" class="header-control fa-solid fa-times" data-tooltip="Close Window" aria-label="Close Window" data-action="close"></button>
        const minimizeButton = document.createElement("button");
        minimizeButton.classList.add("header-control", "fa-solid", "fa-window-minimize");
        minimizeButton.setAttribute("data-tooltip", "Minimize Window");
        minimizeButton.setAttribute("aria-label", "Minimize Window");
        minimizeButton.setAttribute("data-action", "minimize");

        close.before(minimizeButton);

        minimizeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            $(".taskbar-items").find(`div[data-tiappid="${app.id}"]`).click()
        }
    }

    static createTaskbarButton(app) {
        if(!ui.taskbar) return;
        if (!game.settings.get("foundry-taskbar", "enableplayers") && !game.user.isGM) return;
        const appV1Check = app instanceof Application && (!app.popOut || !app.options.minimizable || !!app.options.isSidebar);
        const appV2Check = app instanceof foundry.applications.api.ApplicationV2 && (!app.hasFrame || !app.options.window.minimizable);
        if (appV1Check || appV2Check) return;
        if (app instanceof JournalPageSheet && !app.isEditable) return;
        const oldButton = $(".taskbar-items").find(`div[data-tiappid="${app.appId ?? app.id}"]`);
        if (oldButton.length) return;
        const taskbarItem = $(`<div class="taskbar-item open" data-tiappid="${app.appId ?? app.id}">${app.title}</div>`);
        taskbarItem.on("click", () => {
            Taskbar.cleanUpButtons();
            try {
                const isVisible = taskbarItem.hasClass("open");
                const isMinimized = app.minimized;
                const isActive = app === ui.activeWindow;
                if (!isVisible) {
                    taskbarItem.toggleClass("open");
                    app.bringToTop();
                    $(app.element).toggle(200);
                    return;
                }
                if (isMinimized) {
                    app.bringToTop();
                    app.maximize();
                    return;
                }
                if (!isActive) {
                    app.bringToTop();
                    return;
                }
                taskbarItem.toggleClass("open");
                $(app.element).toggle(200);
                try {
                    const sortedWindows = Object.values(ui.windows).concat(Array.from(foundry.applications.instances.values())).sort((a, b) => b.position.zIndex - a.position.zIndex);
                    if (sortedWindows[1]) sortedWindows[1].bringToTop();
                } catch (e) {
                    ui.notifications.error("Taskbar: An error occurred while trying to bring the window to top, please check the console (F12) for more information and report it in the discord channel");
                    console.error(e);
                }
            } catch (e) {
                ui.notifications.error("Taskbar: An error occurred while trying to toggle the minimized state, please check the console (F12) for more information and report it in the discord channel");
                console.error(e);
                taskbarItem.fadeOut(200, () => {
                    taskbarItem.remove();
                });
            }
        });
        ui.taskbar.buttons.push({ el: taskbarItem, app: app });
        const removed = Taskbar.cleanUpButtons();
        if (removed.includes(app)) return;
        $(".taskbar-items").append(taskbarItem);
        taskbarItem[0].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    }

    static removeTaskbarButton(app) {
        const btnEl = ui.taskbar.buttons.filter((b) => b.app === app).map((b) => b.el);
        if (!btnEl.length) return;
        for (let btn of btnEl) {
            btn = $(btn);
            btn.fadeOut(200, () => {
                btn.remove();
            });
        }
        ui.taskbar.buttons = ui.taskbar.buttons.filter((b) => b.app !== app);
    }

    static cleanUpButtons() {
        const windows = Object.values(ui.windows).concat(Array.from(foundry.applications.instances.values()))
        const taskbarItems = ui.taskbar.buttons.map((b) => b.app);
        const toRemove = taskbarItems.filter((w) => !windows.includes(w));
        for (let app of toRemove) {
            this.removeTaskbarButton(app);
        }
        return toRemove;
    }
}
