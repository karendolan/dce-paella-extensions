/**
 * #DCE MATT-1794 modify UPV's Paella extended tab adapter for handout downloads.
 * Modified to be smaller, whiter, and not display if nothing is using it.
 * Reference: es.upv.paella.extendedTabAdapterPlugin
 */
Class ("paella.plugins.extendedTabAdapterPlugin", paella.ButtonPlugin, {
  
  getAlignment: function () {
    return 'right';
  },
  getSubclass: function () {
    return "extendedTabAdapterPlugin";
  },
  getIndex: function () {
    return 2030;
  },
  getMinWindowSize: function () {
    return 350;
  },
  getName: function () {
    return "edu.harvard.dce.paella.hideableExtendedTabAdapterPlugin";
  },
  getDefaultToolTip: function () {
    return base.dictionary.translate("Attached Documents");
  },
  getButtonType: function () {
    return paella.ButtonPlugin.type.popUpButton;
  },
  
  // #DCE only show if something is going to use the tab adapter
  showUI: function () {
    // Show if tab contents exist
    var tabs = paella.extendedAdapter.bottomContainer.getElementsByClassName("tabLabel");
    if (tabs && tabs.length > 0) {
      this.parent();
    }
  },
  setup: function () {
    // HIDE UI IF NO tab elements
    var tabs = paella.extendedAdapter.bottomContainer.getElementsByClassName("tabLabel");
    if (! tabs || tabs.length < 1) {
      this.hideUI();
    } else {
      this.parent();
    }
  },

  buildContent: function (domElement) {
    domElement.appendChild(paella.extendedAdapter.bottomContainer);
    // MATT-2094 make the tab adapter resizeable
    // Requires JQuery-UI with resizable option
    $(".buttonPluginPopUp.extendedTabAdapterPlugin").resizable({
      handles: 'ne',
      alsoResize: ".tabsContentContainer",
      minWidth: 150,
      minHeight: 150
    });
    $('.ui-resizable-ne').css({
      'height': '32px', 'width': '32px'
    });
  }
});


new paella.plugins.extendedTabAdapterPlugin();