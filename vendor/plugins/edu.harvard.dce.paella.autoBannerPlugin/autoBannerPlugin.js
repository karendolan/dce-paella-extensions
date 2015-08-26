/**
 * Purpose: To display the appropriate Harvard school banner for the recording
 * Default banner is the Harvard Extension school
 */
Class ("paella.plugins.AutoBannerPlugin", paella.EventDrivenPlugin, {
  getName: function () {
    return 'edu.harvard.dce.paella.autoBannerPlugin';
  },
  
  // Inexact events for series data retrieval
  getEvents: function () {
    return[paella.events.loadPlugins,
    paella.events.singleVideoReady];
  },
  
  // only perform once
  _isBannerUpdated: false,

  // delete if using embedded watch.html template
  _primaryTemplate:
  '<a href="<%= this.href %>" title="<%= this.school %>" tabindex="-1" id="<%= this.schooltag %>Home"></a>',
  
  _secondaryTemplate:
  '<a href="<%= this.privacy %>" id="privacyPolicy">Privacy</a> :: ' +
  '<a href="/engage/ui/pubList.html#/tos" id="terms">Terms of Use</a> :: ' +
  '<span id="copyright">&#169;<%= this.year %> President and Fellows of Harvard College</span>',
  
  _dceBannerMap: {
    "Harvard Extension School": {
      school: "Harvard Extension School",
      href: "//www.extension.harvard.edu",
      privacy: "//www.extension.harvard.edu/help/privacy-policy",
      schooltag: "extension",
      abbreviated: "ext"
    },
    "Harvard Summer School": {
      school: "Harvard Summer School",
      href: "//www.summer.harvard.edu",
      privacy: "//www.summer.harvard.edu/help/privacy-policy",
      schooltag: "summer",
      abbreviated: "sum"
    },
    "Harvard Faculty of Arts and Sciences": {
      school: "Harvard Faculty of Arts and Sciences",
      href: "//www.fas.harvard.edu",
      privacy: "//www.extension.harvard.edu/help/privacy-policy",
      schooltag: "fas",
      abbreviated: "fas"
    }
  },
  
  // Default School
  _dceBannerSchool: 'Harvard Extension School',
  
  _templateData: {},

  _fillInTemplate: function(template, data) {
    var result = template.slice();
    for (var key in data) {
        var replacement = '<%= this.' + key + ' %>';
        result = result.replace(new RegExp(replacement, 'g'), data[key]);
    }
    return result;
  },
  
  _toggleBannerNode: function () {
    if (this._isBannerUpdated) {
        return false;
     }
    try {
      var today = new Date();
      var copyYear = today.getUTCFullYear();
      var dcObj = paella.matterhorn.serie[ 'http://purl.org/dc/terms/'];
      if (dcObj && dcObj.creator && dcObj.creator.length > 0) {
        this._dceBannerSchool = dcObj.creator[0].value;
      }
      this._templateData = {
        year: copyYear,
        school: this._dceBannerMap[ this._dceBannerSchool].school,
        href: this._dceBannerMap[ this._dceBannerSchool].href,
        privacy: this._dceBannerMap[ this._dceBannerSchool].privacy,
        schooltag: this._dceBannerMap[ this._dceBannerSchool].schooltag,
        abbreviated: this._dceBannerMap[ this._dceBannerSchool].abbreviated
      };
      
      // This assumes an element with Id dceHeader in the watch.html
      jQuery('#dceHeader').attr("class", this._dceBannerMap[ this._dceBannerSchool].schooltag);
      // Replace existing banner parts with the updates
      jQuery('#dceHeader .primary').empty().append(this._fillInTemplate(this._primaryTemplate, this._templateData));
      jQuery('#dceHeader .secondary').empty().append(this._fillInTemplate(this._secondaryTemplate, this._templateData));
      // now show the header
      jQuery('#dceHeader').animate({
        top: '0px'
      },
      1000);
      this._isBannerUpdated = true;
    }
    catch (err) {
      console.log(err.stack);
    }
  },
  
  setup: function () {
    // hide the header until it's set to the correct banner
    jQuery('#dceHeader').animate({
      top: '-60px'
    },
    1000);
  },
  
  onEvent: function (event, params) {
    this._toggleBannerNode();
  }
});

paella.plugins.autoBannerPlugin = new paella.plugins.AutoBannerPlugin();
