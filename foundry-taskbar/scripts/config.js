Hooks.once('init', async function() {

  game.settings.register("foundry-taskbar", "taskbarSettings", {
    scope: "client",
    config: false,
    type: Object,
    default: {},
  });

  game.settings.register("foundry-taskbar", "enableplayers", {
    name: "Enable For Players",
    hint: "Enable the taskbar for players.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      new Taskbar()
    },
  });

  game.settings.register("foundry-taskbar", "moveplayersmacro", {
    name: "Move Players and Macro",
    hint: "Move players and macros up to not get covered by the taskbar. (requires refresh)",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("foundry-taskbar", "reduceSidebar", {
    name: "Reduce Sidebar",
    hint: "Reduce the size of the sidebar to have the taskbar always at full width. (requires refresh)",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("foundry-taskbar", "hidegmscreenbtn", {
    name: "Hide GM Screen Button",
    hint: "Hide GM Screen Button, a quick access button in the taskbar will let you toggle gm screen instead",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("foundry-taskbar", "dockPlayersList", {
    name: "Dock Players List",
    hint: "Docks player list in taskbar",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,    
  });

  game.settings.register("foundry-taskbar", "dockMacroBar", {
    name: "Dock Macro Bar",
    hint: "Docks macro bar in taskbar",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,    
  });


  game.settings.register('foundry-taskbar', 'showOfflinePlayersInDockedMode', {
    name: "Show Offline Players",
    hint: "When Players is Docked, Show offline Players.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,       
  })

  game.settings.register("foundry-taskbar", "autodocksmalltime", {
    name: "Auto Dock SmallTime",
    hint: "Automatically Dock SmallTime on startup",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });


  Hooks.on("getApplicationHeaderButtons", Taskbar.injectButtons);
  Hooks.on("renderApplicationV2", Taskbar.injectButtonsV2);
    Hooks.on("getItemSheetHeaderButtons", Taskbar.injectButtons);
    Hooks.on("getActorSheetHeaderButtons", Taskbar.injectButtons);
    Hooks.on("getSidebarTabHeaderButtons", Taskbar.injectButtons);
  Hooks.on("renderApplication", Taskbar.createTaskbarButton);
  Hooks.on("renderApplicationV2", Taskbar.createTaskbarButton);
    Hooks.on("renderItemSheet", Taskbar.createTaskbarButton);
    Hooks.on("renderActorSheet", Taskbar.createTaskbarButton);
    Hooks.on("renderSidebarTab", Taskbar.createTaskbarButton);
  Hooks.on("closeApplication", Taskbar.removeTaskbarButton);
  Hooks.on("closeApplicationV2", Taskbar.removeTaskbarButton);
    Hooks.on("closeItemSheet", Taskbar.removeTaskbarButton);
    Hooks.on("closeActorSheet", Taskbar.removeTaskbarButton);
    Hooks.on("closeSidebarTab", Taskbar.removeTaskbarButton);

});

Hooks.once('ready', function() {

    new window.Ardittristan.ColorSetting("foundry-taskbar", "taskbarColor", {
        name: "Taskbar Main Color",
        hint: "Color of the Taskbar",
        label: "Color",
        defaultColor: "#b7b7b71b",
        scope: "world",
        onChange: function (sett) {
          document.documentElement.style.setProperty(
            "--ft-background-color",
            sett
          );
        },
      });

      if(game.settings.get("foundry-taskbar", "moveplayersmacro") && (game.user.isGM || game.settings.get("foundry-taskbar", "enableplayers"))) {
        const sheet = document.createElement('style')
        sheet.id = "ft-move-players-macro"
        sheet.innerHTML = `
        #ui-left {
            height: calc(100% - (var(--ft-height)));
        }
        
        #ui-bottom {
          margin-bottom: calc(var(--ft-height));
        }`;
        document.body.appendChild(sheet);
      }
      if(game.settings.get("foundry-taskbar", "reduceSidebar") && (game.user.isGM || game.settings.get("foundry-taskbar", "enableplayers"))){
        const sheet = document.createElement('style')
        sheet.id = "ft-reducesidebar"
        sheet.innerHTML = `
        #sidebar{
          height: calc(99vh - var(--ft-height));
      }`;
        document.body.appendChild(sheet);
        document.documentElement.style.setProperty(
          "--ft-sidebar",
          "0px"
        );
      }


ui.taskbar = new Taskbar()
});

//Module Handling

Hooks.on("renderGmScreenApplicationDrawer", (app) => {
  if(game.settings.get("foundry-taskbar", "hidegmscreenbtn") && !app.expanded)
    $("body").find(`button[data-action="toggle-gm-screen"]`).hide();
})

Hooks.on("gmScreenOpenClose", (app,options) => {
  if(game.settings.get("foundry-taskbar", "hidegmscreenbtn")){
    if(!options.isOpen){
      $("body").find(`button[data-action="toggle-gm-screen"]`).hide();
    }else{
      $("body").find(`button[data-action="toggle-gm-screen"]`).show();
    }
  }
})

Hooks.once("renderSmallTimeApp", (app, html) => {
  setTimeout(() => {
    if (game.settings.get("foundry-taskbar", "autodocksmalltime")) {
    if(game.modules.get("smalltime")?.active) game.settings.set('smalltime', 'pinned', false);
    
      $(".taskbar-tray").prepend(html.closest(".app"));
    }
  }, 1);
})