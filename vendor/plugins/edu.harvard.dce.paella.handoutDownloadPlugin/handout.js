/**
 * #DCE MATT-1794, UI pluging for user to access one or more Mediapackage attachments
 * of type "attachment/notes". For example, a PDF handout.
 * #DCE-1840, Change handout download to a single button click
 */
Class ("paella.plugins.handoutDownloadPlugin", paella.ButtonPlugin,{
	_attachmentPath: ['matterhorn', 'episode', 'mediapackage', 'attachments', 'attachment'],
	_downloadUrl:null,

	getAlignment:function() { return 'right'; },
	getSubclass:function() { return "handoutDownloadPlugin"; },
	getIndex:function() { return 2030; },
	getMinWindowSize:function() { return 350; },
	getName:function() { return "edu.harvard.dce.paella.handoutDownloadPlugin"; },
	getDefaultToolTip:function() { return base.dictionary.translate("Download Class Handout"); },

    setup: function () {
       // make sure there is something to put in the something else
       if ((this._downloadUrl !== null) && (this.container !== null)) {
          $(this.container).append(this.createAnchorLink());
       }
    },

    checkEnabled: function (onSuccess) {
        // retrieve any attached handouts (type "attachment/notes")
        // FYI, live events do not contain the attachments section
        if (this.pathExists(paella, this._attachmentPath)) {
          var attachments = paella.matterhorn.episode.mediapackage.attachments.attachment;
          if (!(attachments instanceof Array)) {
            attachments =[attachments];
          }
          this.setDownloadUrl(attachments);
        }
        // verify download url was set
        var isenabled = (this._downloadUrl !== null );
        onSuccess(isenabled);
    },

    action:function(button) {
       var win = window.open(this._downloadUrl, '_blank');
       win.focus();
    },

    // Accessibility friendly embedded anchor ref
    createAnchorLink:function(){
        var link = document.createElement('a');
        link.id = 'downloadHandoutLink';
        link.setAttribute('target', '_blank');
        link.setAttribute('aria-label', 'Download Course Attachment');
        link.setAttribute('download','download'); //HTML5 download option
        link.setAttribute('href', this._downloadUrl);
        return link;
    },

    setDownloadUrl: function(attachments) {
       var self = this;
       attachments.forEach( function getUrl(attachment) {
          if (attachment !== undefined) {
            if (attachment.type === "attachment/notes") {
              // if it is already set, then we've got more than one Course handout, save a note for debugging.
              if (self._downloadUrl !== null ) {
                // Multiple attachments can be supported by the extended tab plugin.
                paella.debug.log("Found more than one attachment/notes! Ignoring " + self._downloadUrl  + " and linking to " + attachment.url);
              }
              self._downloadUrl = attachment.url;
            }
          }
        });
    },

     // Borrowed from Jim's npm published "object-path-exists"
    pathExists: function(object, path) {
       var current = object;
       return path.every(segmentExists, true);
       function segmentExists(segment) {
         current = current[segment];
         return current;
       }
    }

});

new paella.plugins.handoutDownloadPlugin();

