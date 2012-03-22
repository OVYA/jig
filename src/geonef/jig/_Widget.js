define("geonef/jig/_Widget", ["dijit/_Widget", "dojo"], function(_Widget, dojo) {

/**
 * Base class widget class
 *
 * Child classes should define 'makeContentNodes' as a function
 * returning an array of node definitions (first arg to geonef.jig.makeDOM)
 */
dojo.declare('geonef.jig._Widget', dijit._Widget,
{
  'class': 'jigWidget',

  postMixInProperties: function() {
    this.domWidgets = [];
  },

  buildRendering: function() {
    if (!this.domNode) {
      this.domNode = this.dom(
        ['div', { 'class': this['class'] }, this.makeContentNodes()]);
    }
    this.inherited(arguments);
    // console.log('this.domNode', this.domNode, this);
  },

  startup: function() {
    this.inherited(arguments);
    this.domWidgets.forEach(function(w) { w.startup(); });
  },

  destroyRendering: function() {
    if (this.domWidgets) {
      this.domWidgets.forEach(function(w) { w.destroy(); });
      delete this.domWidgets;
    }
    this.inherited(arguments);
  },


  dom: function(struct) {
    return geonef.jig.makeDOM(struct, this);
  }

});

return geonef.jig._Widget;
});