/**
 *      <header id="dceHeader">
<div class="primary">
<a href="//www.extension.harvard.edu" title="Harvard Extension School" tabindex="-1" lid="extensionHome"></a>
</div>
<div class="secondary">
<a href="//www.extension.harvard.edu/help/privacy-policy" id="privacyPolicy">Privacy</a> ::
<a href="//www.extension.harvard.edu/open-learning-initiative/terms-of-use" id="terms">Terms of Use</a> ::
<span id="copyright">&copy; 2014 President and Fellows of Harvard College</span>
</div>
</header>

'<a href="//www.extension.harvard.edu/help/privacy-policy" id="privacyPolicy">Privacy</a> :: ' +
'<a href="//www.extension.harvard.edu/open-learning-initiative/terms-of-use" id="terms">Terms of Use</a> :: ' +
'<span id="copyright">&copy; 2014 President and Fellows of Harvard College</span>',


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
  
  // delete if using embedded watch.html template
  _primaryTemplate:
  '<a href="<%= this.href %>" title="<%= this.school %>" tabindex="-1" id="<%= this.shortId %>Home"></a>',
  
  _secondaryTemplate:
  '<a href="<%= this.privacy %>" id="privacyPolicy">Privacy</a> :: ' +
  '<a href="/engage/ui/pubList.html#/tos" id="terms">Terms of Use</a> :: ' +
  '<span id="copyright">&#169;<%= this.year %> President and Fellows of Harvard College</span>',
  
  _dceBannerMap: {
    "Harvard Extension School": {
      school: "Harvard Extension School",
      href: "//www.extension.harvard.edu",
      privacy: "//www.extension.harvard.edu/help/privacy-policy",
      shortId: "extension",
      abbreviated: "ext"
    },
    "Harvard Summer School": {
      school: "Harvard Summer School",
      href: "//www.summer.harvard.edu",
      privacy: "//www.summer.harvard.edu/help/privacy-policy",
      shortId: "summer",
      abbreviated: "sum"
    },
    "Harvard Faculty of Arts and Sciences": {
      school: "Harvard Faculty of Arts and Sciences",
      href: "//www.fas.harvard.edu",
      privacy: "//www.extension.harvard.edu/help/privacy-policy",
      shortId: "fas",
      abbreviated: "fas"
    }
  },
  
  // Default School
  _dceBannerSchool: 'Harvard Extension School',
  
  _templateData: {
  },
  
  _toggleBannerNode: function () {
    try {
      var today = new Date();
      var copyYear = today.getUTCFullYear();
      var dcObj = paella.matterhorn.serie[ 'http://purl.org/dc/terms/'];
      if (dcObj && dcObj.creator && dcObj.creator[0].value) {
        this._dceBannerSchool = dcObj.creator[0].value;
      }
      this._templateData = {
        year: copyYear,
        school: this._dceBannerMap[ this._dceBannerSchool].school,
        href: this._dceBannerMap[ this._dceBannerSchool].href,
        privacy: this._dceBannerMap[ this._dceBannerSchool].privacy,
        shortId: this._dceBannerMap[ this._dceBannerSchool].shortId,
        abbreviated: this._dceBannerMap[ this._dceBannerSchool].abbreviated
      };
      
      // TODO:
      // Insert here hiding the header & removing the default header
      // Change the class name
      jQuery('#dceHeader').attr("class", this._dceBannerMap[ this._dceBannerSchool].shortId);
      jQuery('#dceHeader .primary').empty();
      jQuery('#dceHeader .primary').jqoteapp(this._primaryTemplate, this._templateData);
      jQuery('#dceHeader .secondary').empty();
      jQuery('#dceHeader .secondary').jqoteapp(this._secondaryTemplate, this._templateData);
      // now show the header
      jQuery('#dceHeader').animate({
        top: '0px'
      },
      1000);
    }
    catch (err) {
      console.log(err.message);
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
