/**
 * @class Oskari.tampere.bundle.content-editor.view.SideContentEditor
 */
Oskari.clazz.define('Oskari.tampere.bundle.content-editor.view.SideContentEditor',

    /**
     * @static @method create called automatically on construction
     *
     * @param {Oskari.tampere.bundle.content-editor.ContentEditorBundleInstance} instance
     * Reference to component that created this view
     * @param {Object} localization
     * Localization data in JSON format
     * @param {string} layerId
     */
    function (instance, localization, layerId) {
        var me = this;
        me.layerId = layerId;
        me.layerGeometries = null;
        me.layerGeometryType = null;
        me.sandbox = instance.sandbox;
        me.instance = instance;
        me.templates = {
        		wrapper: '<div></div>',
                getinfoResultTable: '<table class="getinforesult_table"></table>',
                tableRow: '<tr></tr>',
                tableCell: '<td></td>',
                tableInput: '<input />',
                header: '<div class="getinforesult_header"><div class="icon-bubble-left"></div>',
                headerTitle: '<div class="getinforesult_header_title"></div>',
                linkOutside: '<a target="_blank"></a>',
                templateGuide: jQuery('<div><div class="guide"></div>' +
                    '<div class="buttons">' +
                    '<div class="cancel button"></div>' +
                    '<div class="finish button"></div>' +
                    '</div>' +
                    '</div>'),
                templateHelper: jQuery(
                    '<div class="drawHelper">' +
                    '<div class="infoText"></div>' +
                    '<div class="measurementResult"></div>' +
                    '</div>'
                )
        };
        me.template = jQuery(
            '<div class="content-editor">' +
            '  <div class="header">' +
            '    <div class="icon-close">' +
            '    </div>' +
            '    <h3></h3>' +
            '  </div>' +
            '  <div class="content">' +
            '  </div>' +
            '</div>');
        me.allVisibleLayers = [];
        me.allLayers = null;
        me.loc = localization;
        me.mainPanel = null;
        me.isLayerVisible = true;
        me.mapLayerService = me.sandbox.getService('Oskari.mapframework.service.MapLayerService');
        me.selectedLayerId = null;
        me.drawPlugin = null;
        me.operationMode = null;
    }, {
        __name: 'ContentEditor',
        /**
         * @method getName
         * @return {String} the name for the component
         */
        getName: function () {
            return this.__name;
        },
    	showMessage: function(title, content, buttons, location) {
            this.closeDialog();
            this._dialog = Oskari.clazz.create('Oskari.userinterface.component.Popup');
            this._dialog.show(title, content, buttons);
        },
        /**
         * Closes the message dialog if one is open
         */
        closeDialog : function() {
            if(this._dialog) {
                this._dialog.close(true);
                this._dialog = null;
            }
        },
         startNewDrawing: function (config) {
            debugger;
            // notify components to reset any saved "selected place" data
            //var evt = this.instance.sandbox.getEventBuilder('DrawPlugin.SelectedDrawingEvent')();
            //this.instance.sandbox.notifyAll(evt);

            // notify plugin to start drawing new geometry
            this.sendDrawRequest(config);
            //this.instance.enableGfi(false);
        },
        /**
         * @method startNewDrawing
         * Sends a StartDrawRequest with given params. Changes the panel controls to match the application state (new/edit)
         * @param config params for StartDrawRequest
         */
        sendDrawRequest: function (config) {
            var me = this,
                conf = jQuery.extend(true, {}, config);
            /*if (conf.drawMode === 'measureline') {
                conf.drawMode = 'line';
            } else if (conf.drawMode === 'measurearea') {
                conf.drawMode = 'area';
            }*/

            var startRequest = this.instance.sandbox.getRequestBuilder('DrawPlugin.StartDrawingRequest')(conf);
            this.instance.sandbox.request(this, startRequest);
        },
        /**
         * @method sendStopDrawRequest
         * Sends a StopDrawingRequest.
         * Changes the panel controls to match the application state (new/edit) if propagateEvent != true
         * @param {Boolean} isCancel boolean param for StopDrawingRequest, true == canceled, false = finish drawing (dblclick)
         */
        sendStopDrawRequest: function (isCancel) {
            var me = this;
            var toolbarRequest = me.sandbox.getRequestBuilder('Toolbar.SelectToolButtonRequest')();
            me.sandbox.request(me, toolbarRequest);

            var request = this.instance.sandbox.getRequestBuilder('DrawPlugin.StopDrawingRequest')(isCancel);
            this.instance.sandbox.request(this, request);
        },
        /**
         * @method parseFeatureFromClickedFeature
         * Returns an OpenLayers feature or null.
         *
         *
         * @return {OpenLayers.Feature.Vector}
         */
        parseFeatureFromClickedFeature: function(clickedGeometry) {
            var data = clickedGeometry[1],
                wkt = new OpenLayers.Format.WKT(),
                feature = wkt.read(data);

            if (feature != null && feature.geometry != null) {
                this.layerGeometries = feature.geometry;
            }
        },
        /**
         * @method render
         * Renders view to given DOM element
         * @param {jQuery} container reference to DOM element this component will be
         * rendered to
         */
        render: function (container) {     	
            var me = this,
                content = me.template.clone();
            debugger;
            me.getLayerGeometryType();
            me.mainPanel = content;
            var mapModule = me.sandbox.findRegisteredModuleInstance('MainMapModule');
            drawPlugin = Oskari.clazz.create('Oskari.mapframework.ui.module.common.mapmodule.DrawPlugin', {id: 'ContentEditorDrawPlugin',multipart: true});
            mapModule.registerPlugin(drawPlugin);
            mapModule.startPlugin(drawPlugin);
            this.drawPlugin = drawPlugin;
            container.append(content);
            $(".icon-close").on('click', function(){
            	me.instance.setEditorMode(false);
            });

            content.find('div.header h3').append(me.loc.title);
            
            content.find('.content').append($("<div>" + me.loc.featureModifyInfo + "</div>"));
            content.find('.content').append($("<div>" + me.loc.toolInfo + "</div>"));
            content.find('.content').append($("<div>" + me.loc.geometryModifyInfo + "</div>"));
            var addFeatureButton = Oskari.clazz.create('Oskari.userinterface.component.Button');
            addFeatureButton.setTitle("Add feature");
            addFeatureButton.setHandler(function () {
                me.sendStopDrawRequest(true);
                var fields = layer.getFields().slice();
                var featureData = [[]];
                for (var i = 0; i < fields.length; i++)
                {
                    featureData[0].push("");
                }
                me._handleInfoResult({layerId:me.layerId, features: featureData }, true);
            });
            var addFeatureButtonContainer = $("<div />");
            addFeatureButton.insertTo(addFeatureButtonContainer);
            content.find('.content').append(addFeatureButtonContainer);
            me._addDrawTools(content);
            
            var saveButton = Oskari.clazz.create('Oskari.userinterface.component.Button');
            saveButton.setPrimary(true);
            saveButton.setTitle(me.loc.buttons.save);
            saveButton.setHandler(function() {
                /*if (me.operationMode == "create") {
                    me.sendRequest();
                } else {*/
                    me.sendStopDrawRequest();
                //}

            });
            
            var cancelButton = Oskari.clazz.create('Oskari.userinterface.component.Button');
            cancelButton.setTitle(me.loc.buttons.cancel);
            cancelButton.setHandler(function() {
                me.sendStopDrawRequest(true);
            	me._handleInfoResult(me.currentData, (me.operationMode == "create" ? true : false));
            });
            var drawToolsContainer = $("<div/>").addClass("content-draw-tools hide");
            content.find('.content').append(drawToolsContainer);
            //content.find('.content').append(toolContainer);
            var buttonsContainer = $("<div/>").addClass("content-editor-buttons hide");
            saveButton.insertTo(buttonsContainer);
            cancelButton.insertTo(buttonsContainer);
            content.find('.content').append(buttonsContainer);
            content.find('.content').append($("<div />").addClass("properties-container"));
            
            me.allLayers = me.sandbox.findAllSelectedMapLayers();
            
            if (!me._checkLayerVisibility(me.layerId)) {
            	me.isLayerVisible = false;
            	me._setLayerVisibility(me.layerId, true);
            }
            me._hideLayers();
            me._disableGFI();
        },
        getLayerGeometryType: function () {
            var me = this;
            jQuery.ajax({
                type : 'GET',
                data : {'layer_id':this.layerId},
                url : ajaxUrl + 'action_route=GetWFSLayerGeometryType',
                success : function(response) {
                    me._parseLayerGeometryResponse(response);
                    $('.content-editor .content').append($("<div>" + me.layerGeometryType + "</div>"));
                    me._addDrawTools();
                }
            });
        },
        _fillLayerGeometries: function(geometries)
        {
            if (this.layerGeometries != null) {
                var layerGeometries = JSON.parse(new OpenLayers.Format.GeoJSON().write(this.layerGeometries));
                if (layerGeometries != null) {
                    if (this.layerGeometries.type == "MultiPoint") {
                        for (var i = 0; i < layerGeometries.coordinates.length; i++) {
                            geometries.push({x: layerGeometries.coordinates[i][0], y: layerGeometries.coordinates[i][1]}); 
                        }
                    } else if (this.layerGeometries.type == "MultiLineString") {
                        for (var i = 0; i < layerGeometries.coordinates.length; i++) {
                            geometries[i] = [];
                            for (var j = 0; j < layerGeometries.coordinates[i].length; j++) {
                                geometries[i].push({x: layerGeometries.coordinates[i][j][0], y: layerGeometries.coordinates[i][j][1]}); 
                            }
                        }
                    } else if (layerGeometries.type == "MultiPolygon") {
                        for (var i = 0; i < layerGeometries.coordinates.length; i++) {
                            geometries[i] = [];
                            for (var j = 0; j < layerGeometries.coordinates[i].length; j++) {
                                geometries[i][j] = [];
                                for (var k = 0; k < layerGeometries.coordinates[i][j].length; k++) {
                                    geometries[i][j].push({x: layerGeometries.coordinates[i][j][k][0], y: layerGeometries.coordinates[i][j][k][1]}); 
                                }
                            }
                        }
                    }
                }
            }

            //geometries.push({x:1,y:2});
        },
        sendRequest: function (geometries)
        {
            var me = this;
            
            var featureData = me._getFeatureData();
            var requestData = {};
            requestData.featureId = featureData[0].value;
            featureData.splice(0, 1);
            requestData.featureFields = featureData;
            requestData.layerId = me.selectedLayerId;
            requestData.geometries = {};
            requestData.geometries.data = [];
            me._fillLayerGeometries(requestData.geometries.data);
            if (geometries != null)
            {
                if (geometries.id.indexOf("OpenLayers_Geometry_MultiPoint_") == 0) {
                    requestData.geometries.type = "multipoint";
                    for (var i = 0; i < geometries.components.length; i++) {
                        requestData.geometries.data.push({x: geometries.components[i].x, y: geometries.components[i].y});
                    }
                } else if (geometries.id.indexOf("OpenLayers_Geometry_MultiLineString_") == 0) {
                    requestData.geometries.type = "multilinestring";
                    for (var i = 0; i < geometries.components.length; i++) {
                        //requestData.geometries.data[i] = [];
                        var tmpLineString = [];
                        for (var j = 0; j < geometries.components[i].components.length; j++) {
                            tmpLineString.push({x: geometries.components[i].components[j].x, y: geometries.components[i].components[j].y});
                        }
                        requestData.geometries.data.push(tmpLineString);
                    }
                } else if (geometries.id.indexOf("OpenLayers_Geometry_MultiPolygon_") == 0) {
                    requestData.geometries.type = "multipolygon";
                    for (var i = 0; i < geometries.components.length; i++) {
                        //requestData.geometries.data[i] = [];
                        var tmpPolygon = [];
                        for (var j = 0; j < geometries.components[i].components.length; j++) {
                            //requestData.geometries.data[i][j] = [];
                            var tmpLinearString = [];
                            for (var k = 0; k < geometries.components[i].components[j].components.length; k++) {
                                //requestData.geometries.data[i][j].push({x: geometries.components[i].components[j].components[k].x, y: geometries.components[i].components[j].components[k].y});
                                tmpLinearString.push({x: geometries.components[i].components[j].components[k].x, y: geometries.components[i].components[j].components[k].y});
                            }
                            tmpPolygon.push(tmpLinearString);
                        }
                        requestData.geometries.data.push(tmpPolygon);
                    }
                }
            }
            debugger;
            requestData.layerName = $("div.getinforesult_header_title").prop("title");

            var okButton = Oskari.clazz.create('Oskari.userinterface.component.Button');
            okButton.setTitle(me.loc.buttons.ok);
            okButton.setHandler(function () {
                me.closeDialog();
            });

            var url = null;
            if (me.operationMode == "create") {
                url = ajaxUrl + 'action_route=InsertFeature';
            } else {
                url = ajaxUrl + 'action_route=SaveFeature';
            }

            jQuery.ajax({
                type : 'POST',
                dataType : 'json',
                beforeSend : function(x) {
                    if(x && x.overrideMimeType) {
                        x.overrideMimeType("application/j-son;charset=UTF-8");
                    }
                },
                data : {'featureData':JSON.stringify(requestData)},
                url : url,
                success : function(app) {
                    me.showMessage(me.loc.featureUpdate.header, me.loc.featureUpdate.success, [okButton]);
                },
                error: function (error) {
                    me.showMessage(me.loc.featureUpdate.header, me.loc.featureUpdate.error, [okButton]);
                }
            });
        },
        /**
         * @method destroy
         * Destroys/removes this view from the screen.
         *
         *
         */
        destroy: function () {
        	var me = this;
        	me._showLayers();
        	
        	var gfiActivationRequestBuilder = me.sandbox.getRequestBuilder('MapModulePlugin.GetFeatureInfoActivationRequest');
            var request = gfiActivationRequestBuilder(true);
            me.sandbox.request(me.instance.getName(), request);
            
            if (!me.isLayerVisible) {
            	me._setLayerVisibility(me.layerId, false);
            }
            
            this.mainPanel.remove();
        },
        /**
         * @method _removeLayers
         * Removes temporarily layers from map that the user cant publish
         * @private
         */
        _hideLayers: function () {
            var me = this,
                sandbox = me.sandbox,
                removeRequestBuilder = sandbox.getRequestBuilder('RemoveMapLayerRequest'),
                i,
                layer;
            debugger;
            for (i = 0; i < me.allLayers.length; i++) {
            	if (me.allLayers[i].isVisible()) {
            		me.allVisibleLayers.push(me.allLayers[i]);
            	}
            }

            if (me.allVisibleLayers) {
                for (i = 0; i < me.allVisibleLayers.length; i += 1) {
                    layer = me.allVisibleLayers[i];
                    if (me.layerId != layer.getId() && layer.isLayerOfType("WFS")) {
                    	me._setLayerVisibility(layer.getId(), false);
                    }
                }
            }
        },
        _showLayers: function () {
        	var me = this;
        	for (var i = 0; i < me.allVisibleLayers.length; i++) {
        		me._setLayerVisibility(me.allVisibleLayers[i].getId(), true);
        	}
        },
        _disableGFI: function () {
        	var me = this;
        	var gfiActivationRequestBuilder = me.sandbox.getRequestBuilder('MapModulePlugin.GetFeatureInfoActivationRequest');
            var request = gfiActivationRequestBuilder(false);
            me.sandbox.request(me.instance.getName(), request);
        },
        _checkLayerVisibility: function (layerId) {
        	var me = this;
        	var layer = me._getLayerById(layerId);
        	if (layer.isVisible()) {
        		return true;
        	}
        	return false;
        },
        _setLayerVisibility: function (layerId, setVisible) {
        	var me = this;
        	
        	var visibilityRequestBuilder = me.sandbox.getRequestBuilder('MapModulePlugin.MapLayerVisibilityRequest');
        	var request = visibilityRequestBuilder(layerId, setVisible);
            me.sandbox.request(me.instance.getName(), request);
        },
        _getLayerById: function (layerId) {
        	var me = this;
        	for (var i = 0; i < me.allLayers.length; i++) {
        		if (me.allLayers[i].getId() == layerId) {
        			return me.allLayers[i];
        		}
        	}
        },
        _handleInfoResult: function (data, create) {
            debugger;
            if (create == true) {
                this.operationMode = "create";
            } else {
                this.operationMode = "edit";
            }

            this.selectedLayerId = data.layerId;
        	this.currentData = data;
            var content = [],
                contentData = {},
                fragments = [],
                colourScheme,
                font;

            $('.content-editor-buttons').removeClass('hide');
            $('.content-draw-tools').removeClass('hide');
            fragments = this._formatWFSFeaturesForInfoBox(data);

            if (fragments != null && fragments.length) {
                contentData.html = this._renderFragments(fragments);
                contentData.layerId = fragments[0].layerId;
                contentData.layerName = fragments[0].layerName;
                contentData.featureId = data.features[0][0];
                content.push(contentData);
                $(".properties-container").empty().append(contentData.html);
            }
        },
        /**
         * @method _formatWFSFeaturesForInfoBox
         */
        _formatWFSFeaturesForInfoBox: function (data) {
            var me = this,
                layer = this.sandbox.findMapLayerFromSelectedMapLayers(data.layerId),
                fields = layer.getFields().slice(),
                hiddenFields = ['__centerX', '__centerY'],
                type = 'wfslayer',
                result,
                markup;
debugger;
            if (data.features === 'empty' || layer === null || layer === undefined) {
                return;
            }
            if (data.features.length > 1)
            {
                data.features = data.features.splice(0, 1);
            }
            
            // replace fields with locales
            fields = _.chain(fields)
                .zip(layer.getLocales().slice())
                .map(function (pair) {
                    // pair is an array [field, locale]
                    if (_.contains(hiddenFields, _.first(pair))) {
                        // just return the field name for now if it's hidden
                        return _.first(pair);
                    }
                    // return the localized name or field if former is undefined
                    return _.last(pair) || _.first(pair);
                })
                .value();

            result = _.map(data.features, function (feature) {
                var feat = _.chain(fields)
                    .zip(feature)
                    .filter(function (pair) {
                        return !_.contains(hiddenFields, _.first(pair));
                    })
                    .foldl(function (obj, pair) {
                        if (pair[0] !== undefined) {
                            obj[_.first(pair)] = _.last(pair);
                        }
                        return obj;
                    }, {})
                    .value();
                
                markup = me._json2html(feat);
                return {
                    markup: markup,
                    layerId: data.layerId,
                    layerName: layer.getLayerName(),
                    type: type
                };
            });

            return result;
        },
        /**
         * @method _json2html
         * @private
         * Parses and formats a WFS layers JSON GFI response
         * @param {Object} node response data to format
         * @return {String} formatted HMTL
         */
        _json2html: function (node, readonly) {
            debugger;
            if (typeof readonly === 'undefined')
            {
                readonly = false;
            }
            // FIXME this function is too complicated, chop it to pieces
            if (node === null || node === undefined) {
                return '';
            }
            var even = true,
                html = $(this.templates.getinfoResultTable),
                row = null,
                keyColumn = null,
                valColumn = null,
                key,
                value,
                vType,
                valpres,
                valueDiv,
                innerTable,
                i;

            for (key in node) {
                if (node.hasOwnProperty(key)) {
                    value = node[key];

                    if (value === null || value === undefined ||
                            key === null || key === undefined) {
                        continue;
                    }
                    vType = (typeof value).toLowerCase();
                    valpres = '';
                    switch (vType) {
                    case 'string':
                        if (value.indexOf('http://') === 0) {
                            valpres = $(this.templates.linkOutside);
                            valpres.attr('href', value);
                            valpres.append(value);
                        } else {
                            valpres = value;
                        }
                        break;
                    case 'undefined':
                        valpres = 'n/a';
                        break;
                    case 'boolean':
                        valpres = (value ? 'true' : 'false');
                        break;
                    case 'number':
                        valpres = '' + value;
                        break;
                    case 'function':
                        valpres = '?';
                        break;
                    case 'object':
                        // format array
                        if (jQuery.isArray(value)) {
                            valueDiv = $(this.templates.wrapper);
                            for (i = 0; i < value.length; i += 1) {
                                innerTable = this._json2html(value[i]);
                                valueDiv.append(innerTable);
                            }
                            valpres = valueDiv;
                        } else {
                            valpres = this._json2html(value);
                        }
                        break;
                    default:
                        valpres = '';
                    }
                    even = !even;

                    row = $(this.templates.tableRow);
                    // FIXME this is unnecessary, we can do this with a css selector.
                    if (!even) {
                        row.addClass('odd');
                    }

                    keyColumn = $(this.templates.tableCell);
                    keyColumn.append(key);
                    row.append(keyColumn);
                    
                    valColumn = $(this.templates.tableCell);
					if (key == "__fid" || readonly) {
						valColumn.append(value);
					} else {
                        valInput = $(this.templates.tableInput);
                        valInput.val(value);
                        valColumn.append(valInput);
					}
					row.append(valColumn);
                    html.append(row);
                }
            }
            return html;
        },
        /**
         * Wraps the html feature fragments into a container.
         *
         * @method _renderFragments
         * @private
         * @param  {Object[]} fragments
         * @return {jQuery}
         */
        _renderFragments: function (fragments) {
            var me = this;

            return _.foldl(fragments, function (wrapper, fragment) {
                var fragmentTitle = fragment.layerName,
                    fragmentMarkup = fragment.markup;

                if (fragment.isMyPlace) {
                    if (fragmentMarkup) {
                        wrapper.append(fragmentMarkup);
                    }
                } else {
                    var contentWrapper = $(me.templates.wrapper),
                        headerWrapper = $(me.templates.header),
                        titleWrapper = $(me.templates.headerTitle);

                    titleWrapper.append(fragmentTitle);
                    titleWrapper.attr('title', fragmentTitle);
                    headerWrapper.append(titleWrapper);
                    contentWrapper.append(headerWrapper);

                    if (fragmentMarkup) {
                        contentWrapper.append(fragmentMarkup);
                    }
                    wrapper.append(contentWrapper);
                }

                delete fragment.isMyPlace;

                return wrapper;
            }, $(me.templates.wrapper));
        },
        _getFeatureData: function () {
            var result = [];
            $('.getinforesult_table').first().find('tr').each(function () {
                var key = $(this).find('td').eq(0).html();
                var val = null;
                if ($(this).find('td').eq(1).find("input").length > 0) {
                    val = $(this).find('td').eq(1).find("input").val();
                } else {
                    val = $(this).find('td').eq(1).html();
                }
                
                result.push({ "key": key, "value": val });
            });
            debugger;
            return result;
        },
        _parseLayerGeometryResponse: function (response) {
            if (response == "gml:MultiPointPropertyType")
            {
                this.layerGeometryType = "MultiPoint";
            }
            else if (response == "gml:MultiLineStringPropertyType")
            {
                this.layerGeometryType = "MultiLineString";
            }
            else if (response == "gml:MultiPolygonPropertyType" || response == "gml:MultiSurfacePropertyType")
            {
                this.layerGeometryType = "MultiPolygon";
            }
        },
        _addDrawTools: function () {
            debugger;
            var me = this;
            var pointButton = $("<div />").addClass('add-point tool');
            if (me.layerGeometryType == "MultiPoint") {
                pointButton.on('click', function() {
                        me.startNewDrawing({
                            drawMode: 'point'
                        });
                });
            } else {
                pointButton.addClass("disabled");
            }
            
            var lineButton = $("<div />").addClass('add-line tool');
            if (me.layerGeometryType == "MultiLineString") {
                lineButton.on('click', function() {
                        me.startNewDrawing({
                            drawMode: 'line'
                        });
                });
            } else {
                lineButton.addClass("disabled");
            }

            var areaButton = $("<div />").addClass('add-area tool');
            if (me.layerGeometryType == "MultiPolygon") {
                areaButton.on('click', function() {
                        me.startNewDrawing({
                            drawMode: 'area'
                        });
                });
            } else {
                areaButton.addClass("disabled");
            }

            var geomEditButton = $("<div />").text("X").addClass('tool');
            //if (me.layerGeometryType == "MultiPolygon") {
                geomEditButton.on('click', function() {
                    //alert("geomEdit");
                    debugger;
                    me.startNewDrawing({
                        geometry: me.layerGeometries.components[0]
                    });
                });
            //} else {
            //    areaButton.addClass("disabled");
            //}

            /*var lineButton = $("<div />").addClass('add-line tool').on('click', function() {
                if (me.layerGeometryType == "MultiLineString") {
                    me.startNewDrawing({
                        drawMode: 'line'
                    });
                }
            });
            var areaButton = $("<div />").addClass('add-area tool').on('click', function() {
                if (me.layerGeometryType == "MultiPolygon") {
                    me.startNewDrawing({
                        drawMode: 'area'
                    });
                }
            });*/
            
            var toolContainer = $("<div />").addClass('toolrow');
            toolContainer.append(pointButton);
            toolContainer.append(lineButton);
            toolContainer.append(areaButton);
            toolContainer.append(geomEditButton);
            $('.content-draw-tools').append(toolContainer);
        }
    }, {
        /**
         * @property {String[]} protocol
         * @static
         */
        protocol: ['Oskari.mapframework.module.Module']
    });
