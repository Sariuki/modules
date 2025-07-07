Hooks.on("collapseSidebar", (sidebar, collapsed) => {
  const alwaysMax = game.settings.get("foundry-taskbar", "reduceSidebar")
  document.documentElement.style.setProperty(
    "--ft-sidebar-secondary",
    collapsed ? "0px" : "305px"
  );
  if(alwaysMax) {
    document.documentElement.style.setProperty(
      "--ft-sidebar",
      "0px"
    );
  }else{
    document.documentElement.style.setProperty(
      "--ft-sidebar",
      collapsed ? "0px" : "305px"
    );
  }

  });