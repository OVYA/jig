define([
  "module",
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/Deferred",
], function(module, declare, lang, Deferred) {


return declare(null, { //--noindent--

  /**
   * Default options to pass to server at createNew(). (ie. 'factory')
   *
   * @type {Object}
   */
  createOptions: null,

  /**
   * Default properties to set the new object with
   *
   * @type {Object}
   */
  defaultProperties: null,

  /**
   * @type {geonef/jig/data/model/ModelStore}
   */
  store: null,

  /**
   * Create a new object and save it (main function to be used)
   *
   * Warning: don't use it directly as an event handler
   *          (the event obj would be got as 'props')
   *
   * @public
   * @param {!Object} props     Properties to init the model object with
   * @param {!Object} options   Options to the store's add() operation
   * @param {string} discriminatorKey The discriminator to use, if used on that Model
   * @return {dojo/Deferred}
   */
  createNew: function(props, options, discriminatorKey) {
    var _this = this;
    options = lang.mixin({}, this.createOptions, options);
    return this.createNewObject(props, discriminatorKey)
      .then(function(obj) {
        if (!obj) { return false; }
        return _this.store.add(obj, options)
          .then(function(obj) {
            if (obj && obj.getId()) {
              _this.afterCreateNew(obj);
            }
          });
      });
  },

  /**
   * Create new object with given properties - asynchronous (to be overloaded if needed)
   *
   * @protected
   * @param {!Object} props     Properties to init the model object with
   * @param {string} discriminatorKey The discriminator to use, if used on that Model
   * @return {geonef/jig/Deferred}
   */
  createNewObject: function(props, discriminatorKey) {
    return this.store.createObject(discriminatorKey)
      .then(function(object) {
        object.setProps(this.defaultProperties);
        object.setProps(props);
        return object;
      });
  },

  /**
   * hook - called after a new object has been saved
   *
   * @param {geonef/jig/data/model/Abstract} object object which has been created
   */
  afterCreateNew: function(object) {},

  declaredClass: module.id

});

});
