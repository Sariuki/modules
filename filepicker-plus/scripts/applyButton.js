Hooks.on("init", () => {
    function addApplyButton(app,html){
        if(!app.options.closeOnSubmit || app?.token?.schema?.name === "PrototypeToken") return;
        const injectPoint = html.find(".sheet-footer");
        const btn = $(`<button type="button"><i class="fas fa-check"></i> Apply</button>`);
        injectPoint.append(btn);
        btn.click((e) => {
            app._onSubmit(e, {preventClose: true, preventRender: true});
            $(e.currentTarget).focus(false);
        })
    }


    Hooks.on("renderTileConfig", addApplyButton)
    //Hooks.on("renderTokenConfig", addApplyButton)
    Hooks.on("renderDrawingConfig", addApplyButton)
    Hooks.on("renderSceneConfig", addApplyButton)
    //Hooks.on("renderAmbientSoundConfig", addApplyButton)
    //Hooks.on("renderAmbientLightConfig", addApplyButton)
    Hooks.on("renderNoteConfig", addApplyButton)


})
