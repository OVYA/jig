define("geonef/jig/data/list/Basic", ["dijit/_Widget", "dijit/_Templated", "geonef/jig/Deferred", "geonef/jig/data/model", "geonef/jig/data/list/BasicRow", "dojo", "geonef/jig/util", "geonef/jig/button/Action", "geonef/jig/button/Link"], function(_Widget, _Templated, Deferred, model, BasicRow, dojo) {

/**
 * Basic list, made from distinct row widgets
 */
dojo.declare('geonef.jig.data.list.Basic', [ dijit._Widget, dijit._Templated ],
{

  panelPath: "Mes couches",

  /**
   * @type {geonef.jig.data.model.Abstract}
   */
  Model: null,

  /**
   * @type {dijit._Widget} Widget class to use for rows
   */
  RowClass: geonef.jig.data.list.BasicRow,

  /**
   * @type {geonef.jig.Deferred}
   */
  whenReady: null,

  postMixInProperties: function() {
    this.inherited(arguments);
    this.whenReady = new geonef.jig.Deferred();
  },

  buildRendering: function() {
    this.inherited(arguments);
    dojo.addClass(this.domNode, 'jigDataListBasic');
  },

  postCreate: function() {
    this.inherited(arguments);
    this.store = geonef.jig.data.model.getStore(this.Model);
    this.refresh();
    this.subscribe(this.store.channel, this.onChannel);
  },

  startup: function() {
    this.inherited(arguments);
    this.whenReady.callback();
  },

  destroy: function() {
    this.clear();
    this.inherited(arguments);
  },

  refresh: function() {
    this.store.query(this.buildQuery())
        .then(dojo.hitch(this, this.populateList))
        .then(geonef.jig.util.busy(this.domNode));
  },

  buildQuery: function() {
    return {};
  },

  populateList: function(results) {
    this.clear();
    if (this.emptyNode) {
      dojo.style(this.emptyNode, 'display', results.length > 0 ? 'none' : '');
    }
    if (this.countLink) {
      this.countLink.set('label', '('+(results.totalCount || results.length)+')');
    }
    (results.length > 0 ? dojo.removeClass : dojo.addClass)(this.domNode, 'empty');
    this.rows = results.map(this.makeRow, this)
                       .map(this.placeRow, this);
  },

  makeRow: function(obj, key) {
    var row = new (this.RowClass)({ object: obj });
    return row;
  },

  /**
   * @type {dijit._Widget} row widget to place
   */
  placeRow: function(row, key) {
    row.placeAt(this.listNode);
    row.startup();
    return row;
  },

  clear: function() {
    if (this.rows) {
      this.rows.forEach(function(row) { row.destroy(); });
    }
    delete this.rows;
  },

  createNew: function(props, options) {
    var self = this;
    var object = this.createNewObject(props)
        .then(function(obj) {
                if (!obj) { return false; }
                console.log('obj', obj);
                return self.store.add(obj, options)
                    .then(function(obj) {
                            if (obj && obj.getId()) {
                              self.afterCreateNew(obj);
                            }
                          });
              })
        .then(geonef.jig.util.busy(this.domNode));
  },

  /**
   * Create new object with given properties - asynchronous
   *
   * @return {geonef.jig.Deferred}
   */
  createNewObject: function(props) {
    var deferred = new geonef.jig.Deferred();
    var object = this.store.createObject();
    object.setProps(props);
    // var object = new (this.Model)(props);
    deferred.resolve(object); // unset object by default
    return deferred;
  },

  onChannel: function(obj, type) {
    if (['put', 'delete'].indexOf(type) !== -1) {
      this.refresh();
    }
  },

  /** hook */
  afterCreateNew: function(object) {},



});

return geonef.jig.data.list.Basic;
});
