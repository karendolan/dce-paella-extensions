/**
 * #DCE MATT-1794, UI pluging for user to access one or more Mediapackage attachments 
 * of type "attachment/notes". For example, a PDF handout.
 * This plugin is modeled on Paella's mh_downloads.js
 * This plugin is dependent on paella.TabBarPlugin.
 */
paella.plugins.TabBarHandoutDownloadPlugin = Class.create(paella.TabBarPlugin, {
    getSubclass: function () {
        return "handouts";
    },
    getTabName: function () {
        return "Handouts";
    },
    getName: function () {
        return "edu.harvard.dce.paella.tabBarHandoutDownloadPlugin";
    },
    getDefaultToolTip:function() { return base.dictionary.translate("Class Handouts"); },
    _domElement: null,
    _attachments: [],
        
    buildContent: function (domElement) {
        this.domElement = domElement;
        this.loadContent();
    },
    checkEnabled: function (onSuccess) {
        // retrieve any attached handouts (type "attachment/notes")
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
    loadContent: function () {
        var container = document.createElement('div');
        container.className = 'handoutsTabBarContainer';
        for (var i = 0; i < this._attachments.length;++ i) {
            var attachment = this._attachments[i];
            if (attachment !== undefined) {
                if (attachment.type == "attachment/notes") {
                    container.appendChild(this.createLink(attachment, i));
                }
            }
        }
        this.domElement.appendChild(container);
    },
    createLink: function (attachment, tabindexcount) {
        var elem = document.createElement('div');
        elem.className = 'handoutLinkContainer';
        var link = document.createElement('a');
        link.className = 'handoutLinkItem';
        link.innerHTML = this.getTextInfo(attachment);
        link.setAttribute('tabindex', 4050 + tabindexcount);
        link.setAttribute('target', '_blank');
        link.href = attachment.url;
        elem.appendChild(link);
        return elem;
    },

    getTextInfo:function(attachment){
	var text = '';
	// parse the handout file name as the text
	if (attachment.url) {
		text = '<span class="handoutLinkText fileName">' + attachment.url.substr(attachment.url.lastIndexOf("/") + 1) + '</span>';
	}
	// in case it sends an attachment mimetype
	var mimetype = '';
	if (attachment.mimetype) {
		text += ' <span class="handoutLinkText MIMEType">[' + paella.dictionary.translate(attachment.mimetype) + ']' + '</span>';
	}
	return text;
    }
});

paella.plugins.tabBarHandoutDownloadPlugin = new paella.plugins.TabBarHandoutDownloadPlugin();

