define("geonef/jig/data/model/ModelStore", ["geonef/jig/api", "dojo", "geonef/jig/util"], function(api, dojo, jigUtil) {

/**
 * Model store - equivalent for Doctrine repositories
 *
 * It is a singleton, meant to be retrieved from geonef.jig.data.model
 * Needs to be instanciated with the 'Model' property.
 *
 * Example:
 *   var customStore = geonef.jig.data.model.getStore(geonef.jig.data.model.Custom);
 *
 *   // customStore instanceof geonef.jig.data.mode.ModelStore (true)
 *   // if geonef.jig.data.model.Custom.prototype.Store is defined, it is used
 *   //  instead of geonef.jig.data.mode.ModelStore
 *
 *   customStore
 *     .get("4e6ffdffa93ac81c5f000000")
 *     .then(function(customObject) {
 *             customObject.set('prop', 'value');
 *             customStore.put(customObject)
 *                        .then(function() {
 *                                  console.log("saved', customObject);
 *                              });
 *           });
 *
 *   var newCustom = customStore.makeObject({ name: "hehe" });
 *   customStore
 *       .add(newCustom)
 *       .then(function(obj) {
 *                 // obj === newCustom
 *                 console.log("saved", obj);
 *             });
 *
 * For an example of a custom store, see geonef.jig.data.model.UserStore.
 *
 * @see geonef.jig.data.model
 * @see geonef.jig.data.model.Abstract
 * @see geonef.jig.data.model.UserStore
 */
dojo.declare("geonef.jig.data.model.ModelStore", null,
{

  /**
   * @type {geonef.jig.data.model.Abstract}
   */
  Model: null,

  /**
   * Server API module for persistance
   *
   * Example: "geonefZig/data/file".
   * If not specified, will be taken from Model's prototype
   *
   * @type {string} module
   */
  module: null,

  /**
   * Local volatile cache
   *
   * @type {Object} index
   */
  index: null,

  /**
   * Channel for notification publishing
   *
   * @type {string} channel
   */
  channel: null,

  /**
   * Additional parameters for server API requests
   *
   * @type {Object} apiParams
   */
  apiParams: {},


  constructor: function(options) {
    this.index = {};
    dojo.mixin(this, options);
    this.apiParams = dojo.mixin({}, this.apiParams);
    this.postMixInProperties();
    if (!this.module) {
      this.module = this.Model.prototype.module;
    }
    if (!this.channel) {
      this.channel = this.Model.prototype.channel;
    }
    this.init();
    this.setupEvents();
  },

  /** hook */
  postMixInProperties: function() {
  },

  /** hook */
  init: function() {
  },

  /** hook */
  setupEvents: function() {
  },

  destroy: function() {
  },

  /**
   * Fetch object by ID
   *
   * If found in the volatile cache, no API request is made.
   *
   * Available options:
   *    - fields:       array of properties to fetch
   *    - fieldGroup:   name of property group to fetch (exclusive of 'fields')
   *    - api:          object of API transport options (see geonef.jig.api)
   *
   * @param {string} id Identifier
   * @param {!Object} options Hash of options
   * @return {geonef.jig.data.model.Abstract}
   */
  get: function(id, options) {
    var obj = this.index[id];
    if (obj && (!options || (!options.fields && !options.fieldGroup))) {
      return geonef.jig.util.newResolvedDeferred(obj);
    } else {
      var self = this;
      return this.apiRequest(dojo.mixin({ action: 'get', id: id }, options),
                             options ? options.api : {})
          .then(function(resp) {
                  if (obj) {
                    obj.fromServerValue(resp.object);
                  } else if (resp.object) {
                    // index the object first before setting values
                    obj = self.index[id] = self.makeObject(resp.object);
                    obj.fromServerValue(resp.object);
                  } else {
                    return null;
                  }
                  return obj;
                });
    }
  },

  /**
   * Fetch property value for given object
   *
   * This is used for "lazy" loading some properties.
   * The property value is automatically updated within the object.
   *
   * @param {geonef.jig.data.model.Abstract} object the model object
   * @param {Array.<string>} props Array of property names to fetch
   * @return {dojo.Deferred} callback whose arg is the property value
   */
  fetchProps: function(object, props) {
    var self = this;
    return this.apiRequest({ action: 'get', id: object.getId(),
                             fields: props })
      .then(function(resp) {
              // var obj = {};
              // props.forEach(function(p) { obj[p] = resp.object[p] || null; });
              // object.fromServerValue(obj);
              object.fromServerValue(resp.object);
              return object;
            });
  },

  /**
   * Get object identifier
   *
   * @return {string}
   */
  getIdentity: function(object) {
    return object.getId();
  },

  /**
   * Stores an object. Will trigger a call to the server API.
   *
   * A ("put") message is sent on the channel right after the
   * request has been made (but before it is executed).
   *
   * @param {geonef.jig.data.model.Abstract} object the model object
   * @param {Object} options API options (see geonef.jig.api)
   * @return {dojo.Deferred} callback whose arg is the model object
   */
  put: function(object, options) {
    var self = this;
    var deferred = this.apiRequest(dojo.mixin(
        { action: 'put',
          object: object.toServerValue(),
        }, options))
      .then(function(resp) {
              // console.log('in PUT then', arguments, object);
              var id = object.getId();
              object.fromServerValue(resp.object);
              if (!id) {
                self.index[object.getId()] = object;
              }
              object.publish(['afterPut']);
              return object;
            });
    object.publish(['put']);
    return deferred;
  },

  /**
   * Add (persist) a new (unpersisted) object
   *
   * A ("create") message is sent on the channel right after the
   * request has been made (but before it is executed).
   * That message is preceded with ("put") caused by the inner 'put'.
   *
   * @param {geonef.jig.data.model.Abstract} object the model object
   * @param {Object} options API options (see geonef.jig.api)
   * @return {dojo.Deferred} callback whose arg is the model object
   */
  add: function(object, options) {
    if (object.getId()) {
      throw new Error("object is not new, it has ID: "+object.getId()+
                      " ["+object.getSummary()+"]");
    }
    options = options || {};
    options.overwrite = false;
    var dfr = this.put(object, options);
    object.publish(['create']);

    return dfr;
  },

  /**
   * Add (persist) a new (unpersisted) object
   *
   * 'query' is something like:
   *   {
   *     stringProp: { op: 'equal', value: 'test' },
   *     integerProp: { op: 'sup', value: 42 },
   *     refProp: { op: 'ref', value: 'test' },
   *   }
   *
   * @param {Object.<string,Object>} query Query filters
   * @param {Array.<string>} options API options (see geonef.jig.api)
   * @return {dojo.Deferred} callback whose arg is the model object
   */
  query: function(query, options) {
    // console.log('query', this, arguments);
    var implied = {};
    var prop, filter;

    // fix query and make up implied value from it
    if (query) {
      for (prop in query) if (query.hasOwnProperty(prop)) {
        filter = query[prop];
        if (filter instanceof geonef.jig.data.model.Abstract) {
          filter = query[prop] = { op: 'ref', value: filter };
        } else if (dojo.isString(filter) || !isNaN(filter)) {
          filter = query[prop] = { op: 'equals', value: filter };
        }
        if (['equals', 'ref'].indexOf(filter.op) !== -1) {
          implied[prop] = filter.value;
        }
        if (filter.value instanceof geonef.jig.data.model.Abstract) {
          filter.value = filter.value.getId();
        }
      }
    }

    return this.apiRequest(dojo.mixin(
        { action: 'query', filters: query, /* options: options || {}*/ }, options))
      .then(dojo.hitch(this,
        function(resp) {
          if (!resp.results) {
            console.error("model query ("+this.module+"): no result array", resp);
            return null;
          }
          return resp.results.map(
            function(data) {
              return this.getLazyObject(dojo.mixin({}, implied, data));
            }, this);
        }));
  },

  /**
   * Remove from DB (unpersist) an object
   *
   * @param {geonef.jig.data.model.Abstract} object the model object
   * @return {dojo.Deferred} callback with no arg
   */
  remove: function(obj) {
    var deferred = this.apiRequest(
        { action: 'delete',
          id: obj.getId(),
        }).then(dojo.hitch(this, function(resp) {
                }));
    obj.publish(['delete']);
    return deferred;
  },

  /**
   * Create new object (for private use)
   *
   * WARNING: the object is not added to the local cache,
   *          and dataForDiscriminator is used only to distinguish
   *          what class to use if a discriminatorProperty is defined.
   *
   * @param {Object} dataForDiscriminator data object whose discriminator
   *                     field (if any) is used to determine the class to instanciate
   * @return {geonef.jig.data.model.Abstract} the new object
   */
  makeObject: function(dataForDiscriminator) {
    var Model = this.Model;
    var field = Model.prototype.discriminatorProperty;
    if (field) {
      var discr = dataForDiscriminator[field];
      var _class = Model.prototype.discriminatorMap[discr];
      if (!_class) {
        throw new Error("makeObject(): invalid discriminator '"+field+"': "+discr);
      }
      Model = geonef.jig.util.getClass(_class);
    }
    var object = new Model({ store: this });
    return object;
  },

  /**
   * Create a fresh new object (to be used from app code)
   *
   * @param {string} discriminatorValue dicriminator value to use (if needed for that model)
   * @return {geonef.jig.data.model.Abstract}
   */
  createObject: function(discriminatorValue) {
    var data = {};
    var field = this.Model.prototype.discriminatorProperty;
    if (field) {
      if (!discriminatorValue) {
        throw new Error("createObject(): discriminator is required");
      }
      data[field] = discriminatorValue;
    }
    var object = this.makeObject(data);
    object.initNew();
    return object;
  },

  /**
   * Create object (or get ref), hydrate from given data
   *
   * This is the right function to use to instanciate a model object
   * which has an identifier.
   *
   * @param {Object} data Hash of property values (must have a valid 'id' key)
   * @return {geonef.jig.data.model.Abstract}
   */
  getLazyObject: function(data) {
    var obj = this.index[data.id];
    if (!obj) {
      obj = this.index[data.id] = this.makeObject(data);
    }
    obj.fromServerValue(data);

    return obj;
  },

  /**
   * Clear the local cache
   *
   * This is used by unit test modules to force data re-fetch.
   * After this call, all previously cached model objects must not be used
   * (or redundant objects could appear, breaking the app logic).
   */
  clearCache: function() {
    this.index = {};
  },


  /**
   * Specialisation of geoenf.jig.api.request, for this class
   */
  apiRequest: function(params, options) {
    return geonef.jig.api.request(
      dojo.mixin({ module: this.module, scope: this },
                   this.apiParams, params),
      options);
  },

  getWktFormat: function() {
    if (!this.wktFormat) {
      this.wktFormat = new OpenLayers.Format.WKT();
    }

    return this.wktFormat;
  }

});


return geonef.jig.data.model.ModelStore;
});

