
dojo.provide('geonef.jig.data.pane.AbstractDataPane');

// parents
dojo.require('dijit._Widget');
dojo.require('geonef.jig.util');

// used in code
dojo.require('geonef.ploomap.input.ExtentView');
dojo.require('geonef.jig.data.editor.Property');

/**
 * Base class for all data panes
 *
 * A data pane is a widget whose role is to "manage" a model object.
 *
 * It is typically a display, which can embed some editing/action
 * functionnalities.
 *
 * For a pure editor (form), geonef.jig.data.editor.AbstractTemplated
 * would better fit.
 *
 * This handles init/load/events around this.object.
 */
dojo.declare('geonef.jig.data.pane.AbstractDataPane', dijit._Widget,
{
  /**
   * The model object - mandatory, must be given at construction
   *
   * @type {geonef.jig.data.model.Abstract}
   */
  object: null,

  /**
   * Properties to fetch
   *
   * @type {Array.<string>} autoRequestProps
   */
  autoRequestProps: [],


  /**
   * @override
   */
  postMixInProperties: function() {
    this.inherited(arguments);
    this.whenDataReady = this.autoRequestProps.length > 0 ?
      this.object.requestProps(this.autoRequestProps) : geonef.jig.util.newResolvedDeferred();
  },

  /**
   * @override
   */
  buildRendering: function() {
    this.inherited(arguments);
    this.whenDataReady.then(geonef.jig.util.busy(this.domNode));
  },

  /**
   * @override
   */
  postCreate: function() {
    this.inherited(arguments);
    this.subscribe(this.object.channel, this.onModelChannel);
  },

  /**
   *  @override
   */
  startup: function() {
    this.inherited(arguments);
    this.whenDataReady.then(dojo.hitch(this, this.onDataReady));
  },

  /**
   * Called after model data is ready (props are fetched)
   */
  onDataReady: function() {
    this.onModelChange();
  },

  /**
   * Model channel subscriber (registered in 'postCreate')
   *
   * @param {geonef.jig.data.model.Abstract} object
   * @param {string} type
   */
  onModelChannel: function(object, type) {
    if (object !== this.object) { return; }
    if (type === 'put') {
      this.onModelChange();
    }
    if (type === 'delete') {
      this.destroy();
    }
  },

  /**
   * Hook - when the model object has changed
   *
   * It should be used by child classed to make custom updates if needed.
   */
  onModelChange: function() {
    this.onPanelPathChange();
  },

  onPanelPathChange: function() {},

  /** hook */
  onClose: function() {},

});