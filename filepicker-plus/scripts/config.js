Hooks.once("init", async function () {

    libWrapper.register("filepicker-plus", "FilePicker.defaultOptions", function (wrapped, ...args) {
        const options = wrapped(...args);
        options.resizable = true;
        options.width = game.settings.get("filepicker-plus", "size");
        return options;
    });

    game.settings.register("filepicker-plus", "sidebarFilepicker", {
        name: "Enable Filepicker Sidebar Tab",
        hint: "Add a new tab to the sidebar that allows you to browse and upload files, as well as drag and drop images/3D Models onto the scene.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true,
    });
  
      game.settings.register("filepicker-plus", "placeastokens", {
          name: "Place images as Tokens",
          hint: "When dragging an image onto the scene, place it as a token instead of a tile if you are on the token layer (sidebar picker only)",
          scope: "world",
          config: true,
          type: Boolean,
          default: true,
      });

    game.settings.register("filepicker-plus", "size", {
        name: "Filepicker Size",
        hint: "Width of the filepicker",
        scope: "world",
        config: true,
        type: Number,
        choices: {
            520: "Default",
            650: "Large",
            810: "Extra Large",
            970: "Massive",
        },
        default: 520,
        onChange: (setting) => {
            document.documentElement.style.setProperty("--filepickerplus-width", setting + "px");
        },
    });

    document.documentElement.style.setProperty("--filepickerplus-width", game.settings.get("filepicker-plus", "size") + "px");

    game.settings.register("filepicker-plus", "imagepreview", {
        name: "Image-Video Preview",
        hint: "Display the image or video preview when hovering over them in the filepicker",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register("filepicker-plus", "threepreview", {
        name: "3D Preview",
        hint: "Show 3D Previews, requres 3D Portraits. If this setting is disabled, the 3D File Thumbnail will be used instead (if present).",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    });

    game.settings.register("filepicker-plus", "audiopreview", {
        name: "Audio Preview",
        hint: "Play an audio preview when hovering over sounds in the file picker",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
  
    game.settings.register("filepicker-plus", "audiopreviewdelay", {
        name: "Audio Preview Delay",
        hint: "Delay in ms before the preview sound starts playing",
        scope: "world",
        config: true,
        type: Number,
        default: 500,
    });

    game.settings.register("filepicker-plus", "audiopreviewvol", {
        name: "Audio Preview Volume",
        hint: "Volume of the preview sound",
        scope: "world",
        config: true,
        type: Number,
        default: 0.5,
        range: {
            min: 0.1,
            max: 1,
            step: 0.05,
        },
    });

    game.settings.register("filepicker-plus", "enablecolortheme", {
        name: "Enable Color Theme",
        hint: "Enable the dark color theme for the filepicker, if you have a module or system that appies a theme to the filepicker, you might want to disable this.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
});
