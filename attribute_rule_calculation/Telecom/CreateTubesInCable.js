// This rule will generate contained spatial/non spatial features

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation
var valid_asset_types = [44];

var identifier = $feature.Identifier;
var line_class = 'CommunicationsLine';
var fiber_count = $feature.ContentCount;
var cable_design = $feature.CableDesign;

var contained_features_AG = 2;
var contained_features_AT = 21;

var device_fs = FeatureSetByName($datastore, "CommunicationsDevice", ["globalid", "assetgroup", 'assettype'], false);

// ************* End Section *****************
function get_features_switch_yard(class_name, fields, include_geometry) {
    var class_name = Split(class_name, '.')[-1];
    var feature_set = null;

    if (class_name == 'CommunicationsDevice') {
        feature_set = FeatureSetByName($datastore, 'CommunicationsDevice', fields, include_geometry);
    } else if (class_name == 'CommunicationsAssembly') {
        feature_set = FeatureSetByName($datastore, 'CommunicationsAssembly', fields, include_geometry);
    } else {
        feature_set = FeatureSetByName($datastore, 'CommunicationsDevice', fields, include_geometry);
    }
    return feature_set;
}

function fiber_ending_type(feat) {
    if (IsEmpty(feat)) {
        return 'unknown'
    }
    if (indexof([7], feat['AssetGroup']) == -1 && indexof([130], feat['AssetType']) == -1) {
        return 'splice'
    } else if (indexof([10], feat['AssetGroup']) == -1 && indexof([33], feat['AssetType']) == -1) {
        return 'splitter'
    }
    return 'unknown'
}

function adjust_z(line_geo, z_value) {
    var line_shape = Dictionary(Text(line_geo));
    var new_paths = [];
    for (var i in line_shape['paths']) {
        var current_path = line_shape['paths'][i];
        var new_path = [];
        for (var j in current_path) {
            new_path[Count(new_path)] = [current_path[j][0], current_path[j][1], z_value];
        }
        new_paths[count(new_paths)] = new_path
    }
    line_shape['paths'] = new_paths;
    return Polyline(line_shape)
}


function is_even(value) {
    return (Number(value) % 2) == 0;
}

// Function to pop empty values in a dict
function pop_empty(dict) {
    var new_dict = {};
    for (var k in dict) {
        if (IsNan(dict[k])) {
            //new_dict[k] = null;
            continue;
        }
        if (IsEmpty(dict[k])) {
            //new_dict[k] = null;
            continue;
        }
        new_dict[k] = dict[k];
    }
    return new_dict
}

function get_tube_count(fiber_count, design) {
    // Return the tube count based on strands
    if (fiber_count <= 12) {
        return 1;
    } else if (fiber_count <= 60) {
        return 5;
    } else if (fiber_count <= 72) {
        return 6;
    } else if (fiber_count <= 96) {
        return 8;
    } else if (fiber_count <= 120) {
        return 10;
    } else if (fiber_count <= 144) {
        return 12;
    } else if (fiber_count <= 216) {
        return 18;
    } else if (fiber_count <= 264) {
        return 22;
    } else if (fiber_count <= 288) {
        return 24;
    } else if (fiber_count <= 360 && design == 1) {
        return 30;
    } else if (fiber_count <= 432 && design == 1) {
        return 36;
    } else if (fiber_count <= 372 && design == 2) {
        return 30;
    } else if (fiber_count <= 456 && design == 2) {
        return 36;
    }
    return null;
}

if (indexof(valid_asset_types, $feature.assettype) == -1) {
    return identifier;
}

if (IsEmpty(fiber_count) || fiber_count == 0) {
    return {'errorMessage': 'A value is required for the content count field'};
}
var num_childs = null;
var content_val_to_set = null;

if (is_even(fiber_count) == false) {
    return {'errorMessage': 'Fiber count must be even'};
}

num_childs = get_tube_count(fiber_count, cable_design);

if (IsEmpty(num_childs)) {
    return {'errorMessage': 'Tube count not be calculated based on the design and fiber count'};
}
content_val_to_set = fiber_count / num_childs;
if (content_val_to_set % 1 != 0) {
    return {
        'errorMessage': 'Fiber per tube distribution is not uniform: ' +
            'Fiber Count:' + fiber_count + TextFormatting.NewLine +
            'Tube Count:' + num_childs + TextFormatting.NewLine +
            'Strands Per Tube:' + content_val_to_set
    };
}

// Get the start and end vertex of the line
var geo = Geometry($feature);
var vertices = geo['paths'][0];
var sr = geo.spatialReference;
var start_point = vertices[0];
var end_point = vertices[-1];

var start_device_feat = First(Intersects(device_fs, Point(start_point)));
var start_container_row = null;
if (!IsEmpty(start_device_feat)) {
    start_container_row = First(FeatureSetByAssociation(start_device_feat, 'container'));
    if (!IsEmpty(start_container_row)) {
        var fs = get_features_switch_yard(start_container_row['className'], ['globalid'], false);
        var global_id = start_container_row['globalid'];
        start_container_row = First(Filter(fs, "globalid = @global_id"));
    }
}
var end_device_feat = First(Intersects(device_fs, Point(end_point)));
var end_container_row = null;
if (!IsEmpty(end_device_feat)) {
    end_container_row = First(FeatureSetByAssociation(end_device_feat, 'container'));
    if (!IsEmpty(end_container_row)) {
        var fs = get_features_switch_yard(end_container_row['className'], ['globalid'], false);
        var global_id = end_container_row['globalid'];
        end_container_row = First(Filter(fs, "globalid = @global_id"));
    }
}
var attributes = {};
var line_adds = [];
for (var j = 0; j < num_childs; j++) {
    attributes = {
        'AssetGroup': contained_features_AG,
        'AssetType': contained_features_AT,
        'Identifier': j + 1,
        'IsSpatial': 0,
        'FromAGAT': fiber_ending_type(start_device_feat),
        'FromGUID': DefaultValue(start_container_row, {'globalid': null})['globalid'],
        'FromFeature': Text(start_container_row),
        'ToAGAT': fiber_ending_type(end_device_feat),
        'ToGUID': DefaultValue(end_container_row, {'globalid': null})['globalid'],
        'ToFeature': Text(end_container_row),
    };

    attributes['ContentCount'] = content_val_to_set;
    var line_shape = Dictionary(Text(Geometry($feature)));
    var offset_value = iif(is_even(j), Ceil((j + 1) / 2) * .1, -(Ceil((j + 1) / 2) * .1));
    line_adds[Count(line_adds)] = {
        'attributes': attributes,
        'geometry': offset(adjust_z(Polyline(line_shape), j + 1), offset_value),
        'associationType': 'content'
    };
}
var edit_payload = [{'className': line_class, 'adds': line_adds}];

return {
    "result": identifier,
    "edit": edit_payload
};
