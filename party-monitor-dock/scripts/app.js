import { MODULE_ID } from "./main.js";
import { getSetting, setSetting } from "./settings.js";

export class PartyMonitorDock extends Application {
    constructor() {
        super();
        ui.partyMonitorDock = this;
        this.checkSizeAndMoveButtons = foundry.utils.debounce(this.checkSizeAndMoveButtons, 550);
        this.setHooks();
        this.updateSettings();
    }

    static get APP_ID() {
        return "party-monitor-dock";
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: this.APP_ID,
            template: `modules/${MODULE_ID}/templates/${this.APP_ID}.hbs`,
            popOut: false,
            resizable: false,
            minimizable: false,
            title: game.i18n.localize(`${MODULE_ID}.${this.APP_ID}.title`),
        });
    }

    setHooks() {
        this.hooks = [
            {
                hook: "renderSceneControls",
                callback: this.onRender.bind(this),
            },
            {
                hook: "createToken",
                callback: this.refreshCompanions.bind(this),
            },
            {
                hook: "deleteToken",
                callback: this.refreshCompanions.bind(this),
            },
            {
                hook: "updateActor",
                callback: (actor) => this._onActorUpdate(actor.id),
            },
            {
                hook: "deleteActiveEffect",
                callback: (effect) => this._onActorUpdate(effect.parent?.id),
            },
            {
                hook: "createActiveEffect",
                callback: (effect) => this._onActorUpdate(effect.parent?.id),
            },
            {
                hook: "canvasReady",
                callback: this.renderPartyMembers.bind(this),
            },
            {
                hook: "userConnected",
                callback: this.renderPartyMembers.bind(this),
            },
            {
                hook: "updateCombat",
                callback: this._onCombatUpdate.bind(this),
            },
            {
                hook: "deleteCombat",
                callback: this._onCombatUpdate.bind(this),
            }
        ];

        this.hooks.forEach(({ hook, callback }) => Hooks.on(hook, callback));
    }

    async getData() {
        return {
            cornerImage: getSetting("cornerImage"),
            dockRight: getSetting("dockSide") === "right",
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        html = html[0] ?? html;
        this.partyContainer = html.querySelector("#party-container");
        this.renderPartyMembers();
        this.inject();

        html.querySelector("#party-monitor-toggle-controls").addEventListener("click", () => {
            const hideSceneNav = !getSetting("hideSceneNav");
            setSetting("hideSceneNav", hideSceneNav);
        });

        html.querySelector("#party-monitor-toggle").addEventListener("click", () => {
            const hidePartyMonitor = !getSetting("hidePartyMonitor");
            setSetting("hidePartyMonitor", hidePartyMonitor);
        });

        html.querySelector("#party-monitor-reduce").addEventListener("click", () => {
            this.changeSize(-1);
        });

        html.querySelector("#party-monitor-enlarge").addEventListener("click", () => {
            this.changeSize(1);
        });
        this.onRender();
    }

    onRender() {
        if(!this.element[0]) return;
        this.setVisibility();
        this.checkSizeAndMoveButtons();
        this._onCombatUpdate();
    }

    changeSize(amount) {
        const current = getSetting("portraitSize");
        const values = Object.keys(game.settings.settings.get("party-monitor-dock.portraitSize").choices);
        const index = values.indexOf(current);
        const newIndex = Math.max(0, Math.min(values.length - 1, index + amount));
        setSetting("portraitSize", values[newIndex]);
        this.checkSizeAndMoveButtons();
    }

    setVisibility() {
        if (!this.element[0]) return;
        const hidePartyMonitor = getSetting("hidePartyMonitor");
        this.element[0].classList.toggle("party-dock-hidden", hidePartyMonitor);

        const hideSceneNav = getSetting("hideSceneNav");
        const controls = document.querySelector("#controls");
        controls.classList.toggle("party-dock-hidden", hideSceneNav);
        this.element[0].classList.toggle("nav-visible", !hideSceneNav);
        this.inject();
    }

    updateSettings() {
        const portraitSize = getSetting("portraitSize");
        const portraitAlignment = getSetting("dockAlignment");
        const dockSide = getSetting("dockSide");
        document.documentElement.style.setProperty("--pmd-portrait-width", portraitSize);
        document.documentElement.style.setProperty("--pmd-align", portraitAlignment);
        if(this.element[0]) this.element[0].classList.toggle("dock-ui-right", dockSide !== "left");
        this.inject();
    }

    inject() {
        if (!this.element[0]) return;
        const hidePartyMonitor = getSetting("hidePartyMonitor");
        const hideSceneNav = getSetting("hideSceneNav");
        const dockRight = getSetting("dockSide") === "right";
        if (dockRight) {
            document.querySelector("#ui-right").prepend(this.element[0]);
            return;
        }
        if (hidePartyMonitor && !hideSceneNav) {
            document.querySelector("#controls").querySelector(".main-controls").append(this.element[0]);
        } else {
            document.querySelector("#controls").append(this.element[0]);
        }
    }

    checkSizeAndMoveButtons() {
        const html = this.element[0];
        const hudHeight = html.getBoundingClientRect().height;
        let contentHeight = html.querySelector("#party-container").getBoundingClientRect().height;
        html.querySelectorAll(".corner").forEach((corner) => (contentHeight += corner.getBoundingClientRect().height));
        html.querySelectorAll(".party-monitor-buttons").forEach((button) => (contentHeight += button.getBoundingClientRect().height));
        contentHeight -= 10;
        const isOverflowing = contentHeight > hudHeight;
        html.querySelector(".party-monitor-buttons.bottom").style.order = isOverflowing ? -1 : null;
    }

    async renderPartyMembers() {
        const edgeImage = getSetting("edgeImage");
        this.partyContainer.innerHTML = edgeImage ? `<div class="border-background" style="background-image: url('${edgeImage}')"></div>` : "";
        const onlyConnected = getSetting("onlyConnected");
        let users = Array.from(game.users)
            .filter((u) => u.character && u !== game.user && !u.isGM)
            .sort((a, b) => a.character.name.localeCompare(b.character.name));
        if (onlyConnected) users = users.filter((u) => u.active);
        if (game.user.character && !game.user.isGM) users.unshift(game.user);
        this.party = users.map(
            (user) =>
                new PartyMember(
                    user,
                    users.map((u) => u.character),
                ),
        );
        this.party.forEach((member) => {
            this.partyContainer.append(member.element);
            member.render();
        });
    }

    _onCombatUpdate() {
        const inCombat = !!game.combat?.started;
        const hideInCombat = getSetting("hideInCombat");
        this.element[0].classList.toggle("hide-in-combat", hideInCombat && inCombat);
    }

    async _onActorUpdate(actorId) {
        this.party.forEach((member) => member.refreshPortrait(actorId));
    }

    async refreshCompanions() {
        this.party.forEach((member) => member.refreshCompanions());
    }

    async close(...args) {
        this.hooks.forEach(({ hook, callback }) => Hooks.off(hook, callback));
        super.close(...args);
    }
}

class PartyMember {
    constructor(user, characters) {
        this.user = user;
        this.characters = characters;
        this.companions = [];
        this.element = document.createElement("div");
        this.element.classList.add("party-member-actors");
        if (this.user === game.user) this.element.classList.add("self");
        this.options = {};
    }

    getCompanions() {
        const hideCompanions = getSetting("hideCompanions");
        if (hideCompanions) return this.companions = [];
        const tokens = canvas.tokens.placeables.filter((token) => token.actor && token.actor.hasPlayerOwner && token.actor.testUserPermission(this.user, "OWNER"));
        this.companions = tokens.map((token) => token.actor).filter((actor) => actor !== this.user.character && !this.characters.includes(actor) && !actor.flags["item-piles"]?.data?.enabled);
        return this.companions;
    }

    async render() {
        this.element.innerHTML = "";
        const companions = this.getCompanions();
        const actors = [this.user.character, ...companions];
        const handRaised = this.characters.filter((actor) => actor.getFlag(MODULE_ID, "handRaised")).sort((a, b) => b.getFlag(MODULE_ID, "handRaised") - a.getFlag(MODULE_ID, "handRaised")).reverse();
        this.portraits = actors.map((actor) => new ActorPortrait(actor, companions.includes(actor)));
        this.portraits.forEach((portrait) => {
            portrait.handRaisedOrder = handRaised.length > 1 ? handRaised.indexOf(portrait.actor) + 1 : null;
            this.element.append(portrait.element);
            portrait.render();
            if (this.companions.length && !portrait.isCompanion) this.addLinkButton();
        });
    }

    addLinkButton() {
        if (!game.Rideable) return;
        if (!game.user.isGM && game.user !== this.user) return;
        const iContainer = document.createElement("div");
        iContainer.classList.add("party-monitor-buttons", "link-button");
        const i = document.createElement("i");
        i.classList.add("fa-duotone", "fa-link");
        iContainer.append(i);
        this.element.append(iContainer);
        this.linkButton = i;
        i.addEventListener("click", () => this.toggleFollow());
        this.setLinkIcon();
    }

    setLinkIcon(following = null) {
        if (!this.linkButton) return;
        if (following === null) following = this.areCompanionsFollowing();
        this.linkButton.classList.toggle("fa-link", !following);
        this.linkButton.classList.toggle("fa-unlink", following);
        this.linkButton.dataset.tooltip = game.i18n.localize(following ? "party-monitor-dock.app.buttons.stop-follow" : "party-monitor-dock.app.buttons.start-follow");
    }

    toggleFollow(toggle) {
        if (toggle !== undefined) {
            return;
        }
        const playerToken = this.portraits[0].token;
        const companions = this.companions.map((actor) => actor.parent ?? actor.getActiveTokens()[0]).filter((token) => token);
        if (!companions.length) return;

        const leaderId = playerToken.id;
        const followerId = companions.map((token) => token.id);
        const sceneId = game.scenes.viewed.id;
        const isFollowing = this.areCompanionsFollowing();
        if (isFollowing) {
            game.Rideable.StopFollowbyID(followerId, sceneId);
            const followText = game.i18n.localize("party-monitor-dock.notifications.unfollow");
            ui.notifications.info(companions.map((token) => token.name).join(", ") + followText + playerToken.name);
        } else {
            game.Rideable.FollowbyID(followerId, leaderId, sceneId);
            const followText = game.i18n.localize("party-monitor-dock.notifications.follow");
            ui.notifications.info(companions.map((token) => token.name).join(", ") + followText + playerToken.name);
        }
        this.setLinkIcon(!isFollowing);
    }

    areCompanionsFollowing() {
        const playerToken = this.portraits[0].token;
        const companions = this.companions.map((actor) => actor.parent).filter((token) => token);
        if (!companions.length) return false;
        const leaderId = playerToken.id;
        const isFollowing = companions.some((token) => token.flags?.Rideable?.followedTokenFlag === leaderId);
        return isFollowing;
    }

    refreshCompanions() {
        const current = this.companions;
        const updated = this.getCompanions();
        const isChanged = current.length !== updated.length || !current.every((actor) => updated.includes(actor));
        if (isChanged) this.render();
    }

    refreshPortrait(actorId) {
        this.portraits.filter((portrait) => portrait.actor.id === actorId).forEach((portrait) => portrait.render());
    }
}

class ActorPortrait {
    constructor(actor, isCompanion = false) {
        this.actor = actor;
        this.element = document.createElement("div");
        this.element.classList.add("party-member-wrapper");
        this.options = {};
        this.isCompanion = isCompanion;
    }

    get hasPermission() {
        const playerPlayerPermission = this.actor?.hasPlayerOwner && game.settings.get("combat-tracker-dock", "playerPlayerPermission");
        const hasPermission = (this.actor?.permission ?? -10) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER || this.actor.isOwner || playerPlayerPermission;
        return hasPermission;
    }

    async render() {
        const actor = this.actor;
        this.element.innerHTML = await renderTemplate(`modules/${MODULE_ID}/templates/party-member-partial.hbs`, this.getData(this.actor));
        this.element.style.backgroundImage = `url(${game.settings.get("combat-tracker-dock", "portraitImageBackground")})`;
        const portrait = this.element.querySelector(".party-member");
        if (this.isCompanion) portrait.classList.add("companion");

        if (this.isCompanion) {
            this.element.classList.add("companion");
        } else {
            this.element.classList.add("character");
        }

        const displayDescriptionsSetting = game.settings.get("combat-tracker-dock", "displayDescriptions");
        let displayDescriptions = false;
        if (displayDescriptionsSetting === "all") displayDescriptions = true;
        else if (displayDescriptionsSetting === "owner") displayDescriptions = this.actor.isOwner;

        portrait.dataset.tooltip = await TextEditor.enrichHTML(await renderTemplate(`modules/combat-tracker-dock/templates/combatant-tooltip.hbs`, {
            name: actor.name,
            isInitiativeNaN: true,
            hasPermission: this.hasPermission,
            description: CONFIG.combatTrackerDock.generateDescription(actor),
            hasAttributes: true,
            attributes: this.getTrackedAttributes(actor),
            hasEffects: true,
            effects: actor.effects.filter((effect) => effect.active && effect.isTemporary),
            displayDescriptions,
        }));

        portrait.dataset.tooltipClass = "combat-dock-tooltip";

        const portraitBar = this.element.querySelector(".portrait-bar");
        if (portraitBar) portraitBar.style.backgroundColor = game.settings.get("combat-tracker-dock", "attributeColorPortrait");

        this.activateListeners(this.element);
        this._contextMenu(this.element);
    }

    get token() {
        const token = this.actor?.parent?.object ?? this.actor.getActiveTokens()[0];
        return token;
    }

    toggleFollowPartyMember() {
        if (!game.Rideable || this.actor === game.user.character) return;

        const playerToken = game.user.isGM ? canvas.tokens.controlled[0] : canvas.tokens.placeables.find((token) => token.actor === game.user.character);

        const leader = this.token;

        if (!leader || !playerToken || leader === playerToken) return;

        const isFollowingLeader = playerToken?.document?.flags?.Rideable?.followedTokenFlag === leader.id;

        const sceneId = game.scenes.viewed.id;

        if (isFollowingLeader) {
            game.Rideable.StopFollowbyID([playerToken.id], sceneId);
            const followText = game.i18n.localize("party-monitor-dock.notifications.unfollow");
            ui.notifications.info(playerToken.name + followText + leader.name);
        } else {
            game.Rideable.FollowbyID([playerToken.id], leader.id, sceneId);
            const followText = game.i18n.localize("party-monitor-dock.notifications.follow");
            ui.notifications.info(playerToken.name + followText + leader.name);
        }
    }

    toggleMount() {
        if (!game.Rideable || this.actor === game.user.character) return;

        const playerToken = game.user.isGM ? canvas.tokens.controlled[0] : canvas.tokens.placeables.find((token) => token.actor === game.user.character);

        const mount = this.token;

        if (!mount || !playerToken || mount === playerToken) return;

        const isMounted = playerToken?.document?.flags?.Rideable?.RidingFlag;

        const sceneId = game.scenes.viewed.id;

        //game.Rideable.Mount(pselectedTokens, pTarget, pRidingOptions)

        if (isMounted) {
            game.Rideable.UnMount([playerToken.document]);
            const followText = game.i18n.localize("party-monitor-dock.notifications.unmount");
            ui.notifications.info(playerToken.name + followText + mount.name);
        } else {
            game.Rideable.Mount([playerToken.document], mount.document);
            const followText = game.i18n.localize("party-monitor-dock.notifications.mount");
            ui.notifications.info(playerToken.name + followText + mount.name);
        }
    }

    async raiseHand() {
        const actor = this.actor;
        if (!actor) return;
        const timestamp = Date.now();
        const current = actor.getFlag(MODULE_ID, "handRaised");
        if(current) await actor.unsetFlag(MODULE_ID, "handRaised");
        else await actor.setFlag(MODULE_ID, "handRaised", timestamp);
        ui.partyMonitorDock.render(true);
    }

    activateListeners(html) {
        const partyMember = html.querySelector(".party-member");

        //double click to open sheet
        partyMember.addEventListener("dblclick", (event) => {
            event.preventDefault();
            this.actor.sheet.render(true);
        });
        //click to bring to token
        partyMember.addEventListener("click", (event) => {
            event.preventDefault();
            const token = this.token;
            if (!token) return;
            token.control({ releaseOthers: true });
            return canvas.animatePan(token.center);
        });

        partyMember.addEventListener("mouseenter", (event) => {
            if (!this.token) return;
            this.token._onHoverIn(event);
        });

        partyMember.addEventListener("mouseleave", (event) => {
            if (!this.token) return;
            this.token._onHoverOut(event);
        });

        partyMember.addEventListener("dragstart", (event) => {
            event.dataTransfer.setData("text/plain", JSON.stringify({ type: "Actor", uuid: this.actor.uuid }));
        });

        partyMember.draggable = game.user.can("TOKEN_CREATE") && this.actor.isOwner;

        (this.element.querySelectorAll(".portrait-effect") ?? []).forEach((effectEl) => {
            //delete on right click
            effectEl.addEventListener("contextmenu", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const uuid = effectEl.dataset.uuid;
                const effect = await fromUuid(uuid);
                const statusEffect = CONFIG.statusEffects.find((s) => s.img === effect.img);

                const response = await Dialog.confirm({
                    title: game.i18n.localize(`combat-tracker-dock.deleteEffectTitle`),
                    content: game.i18n.localize(`combat-tracker-dock.deleteEffectContent`) + game.i18n.localize(effect?.label ?? statusEffect?.name ?? "") + "?",
                    yes: () => true,
                    no: () => false,
                    defaultYes: false,
                    close: () => false,
                });
                if (!response) return;
                if (!effect) {
                    this.token?.toggleEffect(uuid);
                    return;
                }
                await effect.delete();
                this.render(true);
            });
        });
    }

    getData(actor) {
        const data = actor;
        const portraitResourceSetting = game.settings.get("combat-tracker-dock", "portraitResource");
        const resourceData = this.getResource(portraitResourceSetting, actor);
        data.hasPortraitResource = resourceData.value !== null && resourceData.value !== undefined;
        data.portraitResource = resourceData;
        data.handRaised = actor.getFlag(MODULE_ID, "handRaised");
        data.handRaisedOrder = this.handRaisedOrder;
        const resource = this.getResource(game.settings.get("core", "combatTrackerConfig").resource, actor);
        const resource2 = this.getResource(game.settings.get("combat-tracker-dock", "resource"), actor);

        data.resource = resource;
        data.resource2 = resource2;
        const attributeVisibility = game.settings.get("combat-tracker-dock", "attributeVisibility");

        data.showBars = attributeVisibility === "bars" || attributeVisibility === "both";

        data.showText = attributeVisibility === "text" || attributeVisibility === "both";

        data.hasPermission = this.hasPermission;

        if (!data.hasPermission) {
            data.showBars = false;
            data.showText = false;
            data.resource = { value: null, max: null, percentage: null };
            data.resource2 = { value: null, max: null, percentage: null };
            data.portraitResource = { value: null, max: null, percentage: null };
        }

        return data;
    }

    getTrackedAttributes(actor) {
        const trackedAttributes = game.settings
            .get("combat-tracker-dock", "attributes")
            .map((a) => {
                const resourceData = this.getResource(a.attr, actor);
                const iconHasExtension = a.icon.includes(".");
                return {
                    ...resourceData,
                    icon: iconHasExtension ? `<img src="${a.icon}" />` : `<i class="${a.icon} icon"></i>`,
                    units: a.units || "",
                };
            })
            .filter((a) => a.value !== null && a.value !== undefined);

        return trackedAttributes;
    }

    getResource(resource = null, actor) {
        let max, value, percentage;

        if (!resource) return { max, value, percentage };

        max = foundry.utils.getProperty(actor.system, resource + ".max") ?? foundry.utils.getProperty(actor.system, resource.replace("value", "") + "max");

        value = foundry.utils.getProperty(actor.system, resource) ?? foundry.utils.getProperty(actor.system, resource + ".value");
        if (max !== undefined && value !== undefined && Number.isNumeric(max) && Number.isNumeric(value)) percentage = Math.round((value / max) * 100);

        value = this.validateValue(value);
        max = this.validateValue(max);

        return { max, value, percentage };
    }

    validateValue(value) {
        if (typeof value === "boolean") value = value ? "✓" : "✗";

        if (Array.isArray(value)) value = value.join(", ");

        if (value === "") value = null;

        if (!Number.isNumeric(value) && Object.prototype.toString.call(value) != "[object String]") value = null;

        return value;
    }

    _contextMenu() {
        if (this._contextAdded) return;
        this._contextAdded = true;
        const buttons = [];

        if (this.actor.isOwner && !this.isCompanion) {
            buttons.push({
                name: `party-monitor-dock.app.buttons.context.raise-hand`,
                icon: `<i class="fa-duotone fa-hand"></i>`,
                callback: async (elem) => {
                    this.raiseHand();
                },
            });
        }

        if (game.Rideable && this.actor !== game.user.character) {
            buttons.push(
                {
                    name: `party-monitor-dock.app.buttons.context.follow`,
                    icon: `<i class="fa-solid fa-link"></i>`,
                    callback: async (elem) => {
                        this.toggleFollowPartyMember();
                    },
                },
                {
                    name: `party-monitor-dock.app.buttons.context.mount`,
                    icon: `<i class="fa-solid fa-horse"></i>`,
                    callback: async (elem) => {
                        this.toggleMount();
                    },
                },
            );
        }

        if (window.EpicRolls5e && game.user.isGM && !this.isCompanion) {
            buttons.push({
                name: `party-monitor-dock.app.buttons.context.epicRoll`,
                icon: `<i class="fa-duotone fa-dice-d12"></i>`,
                callback: async (elem) => {
                    const user = Array.from(game.users).find((u) => u.character === this.actor);
                    if (!user) return;
                    new EpicRolls5e.RequestEpicRoll(null, [user.id]).render(true);
                },
            });
        }

        new ContextMenu(this.element, ".party-member", buttons);
    }
}
