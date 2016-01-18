/**
 * #DCE MATT-1794, UI pluging for user to access one or more Mediapackage attachments 
 * of type "attachment/notes". For example, a PDF handout.
 * #DCE-1840, Change handout download to a single button click
 */
Class ("paella.plugins.handoutDownloadPlugin",paella.ButtonPlugin,{
	_attachments: [],
	_attachmentUrl:null,
	_domElement:null,

	
	getAlignment:function() { return 'right'; },
	getSubclass:function() { return "handoutDownloadPlugin"; },
	getIndex:function() { return 2030; },
	getMinWindowSize:function() { return 350; },
	getName:function() { return "edu.harvard.dce.paella.handoutDownloadPlugin"; },
	getDefaultToolTip:function() { return base.dictionary.translate("Class Handout"); },

     showUI: function(){
        // Show if handout attachment exist
        if (this._attachments.length > 0 ) {
           this.parent();
        }
    },

    checkEnabled: function (onSuccess) {
        // retrieve any attached handouts (type "attachment/notes")
        // TODO: use the Jim's is valid path
        var attachments = paella.matterhorn.episode.mediapackage.attachments.attachment;
        if (!(attachments instanceof Array)) {
            attachments =[attachments];
        }
        for (var i = 0; i < attachments.length;++ i) {
            var attachment = attachments[i];
            if (attachment !== undefined) {
                if (attachment.type == "attachment/notes") {
                   this._attachments.push(attachment);
                }
            }
        }
        var isenabled = (this._attachments.length > 0 );
		onSuccess(isenabled);
    },

	action:function(button) {
	    var url = null;
        for (var i = 0; i < this._attachments.length;++ i) {
            var attachment = this._attachments[i];
            if (attachment !== undefined) {
                if (attachment.type == "attachment/notes") {
                   if (url != null ) {
                       // This plugin only supports one attachment/notes. Defaults to the last one found.
                       // Multiple attachments can be supported by the extended tab plugin.
                       paella.debug.log("Found more than one attachment/notes! Ignoring " + url  + " and linking to " + attachment.url);
                   }
                   url = attachment.url;
                }
            }
        }
 		var self = this;
        var win = window.open(url, '_blank');
        win.focus();
	}
});

new paella.plugins.handoutDownloadPlugin();
