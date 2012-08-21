define([
         "dojo/_base/declare",
         "../../_Widget",
         "dojo/_base/lang",
         "dojo/_base/event",
         "dojo/dom-class",
         "../../util",
         "../../util/string"
], function(declare, _Widget, lang, event, domClass, util, string) {

return declare(_Widget,
{

  enableClickEvent: true,

  /**
   * @type {geonef.jig.data.model.Abstract} represented model object
   */
  object: null,

  autoRequestProps: [],

  'class': _Widget.prototype['class'] + ' jigDataRow',


  postMixInProperties: function() {
    this.inherited(arguments);
    this.whenDataReady = this.autoRequestProps.length > 0 ?
      this.object.requestProps(this.autoRequestProps) : util.newResolvedDeferred();
  },

  buildRendering: function() {
    this.inherited(arguments);
    this.whenDataReady.then(util.busy(this.domNode));
  },

  buildRow: function() {
    if (this.object) {
      this.domNode.innerHTML = string.escapeHtml(this.object.getSummary());
      if (this.enableClickEvent) {
        domClass.add(this.domNode, 'link');
      }
    }
  },

  postCreate: function() {
    this.inherited(arguments);
    if (this.enableClickEvent) {
      this.connect(this, 'onClick', this.onItemClick);
    }
  },

  startup: function() {
    this.inherited(arguments);
    this.whenDataReady.then(lang.hitch(this, this.onDataReady));
  },

  onDataReady: function() {
    this.buildRow();
  },

  onItemClick: function(evt) {
    if (evt) {
      event.stop(evt);
    }
    this.onExecute();
  },

  onExecute: function() {
    if (this.object.openPane) {
      this.object.openPane();
    }
  }

});

});
