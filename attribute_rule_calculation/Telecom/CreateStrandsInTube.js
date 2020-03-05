// This rule will generate contained spatial/non spatial features
// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation
var valid_asset_types = [21];

var identifier = $feature.Identifier;
var line_class = 'CommunicationsLine';
var device_class = 'CommunicationsDevice';
var strand_count = $feature.ContentCount;

var contained_features_AG = 9;
var contained_features_AT = 163;

var splice_junction_sql = 'AssetGroup = 8 AND AssetType = 72';
var junction_features_AG = 8;
var junction_features_AT = 72;

var splitter_junction_sql = 'AssetGroup = 8 AND AssetType = 73';


function get_features_switch_yard(class_name, fields, include_geometry) {
    var class_name = Split(class_name, '.')[-1];
    var feature_set = null;

    if (class_name == 'CommunicationsDevice') {
        feature_set = FeatureSetByName($datastore, 'CommunicationsDevice', fields, include_geometry);
    } else if (class_name == 'CommunicationsLine') {
        feature_set = FeatureSetByName($datastore, 'CommunicationsLine', fields, include_geometry);
    } else if (class_name == 'CommunicationsAssembly') {
        feature_set = FeatureSetByName($datastore, 'CommunicationsAssembly', fields, include_geometry);
    } else if (class_name == 'Associations') {
        feature_set = FeatureSetByName($datastore, 'UN_5_Associations', fields, false);
    } else {
        feature_set = FeatureSetByName($datastore, 'CommunicationsDevice', fields, include_geometry);
    }
    return feature_set;
}

// ************* to Section *****************
function create_perp_line(location, line_geo, dist, length_line) {
    //Get the fist point of the line
    var line_vertices = line_geo['paths'][0];
    var line_from_point = line_vertices[0];

    //Buffer the point and clip the line
    var search = Extent(Buffer(location, length_line));
    var segment = Clip(line_geo, search);
    var segment_vertices = segment['paths'][0];
    var segment_from_point = segment_vertices[0];
    segment = Rotate(segment, 90);
    var offset_dist = iif(length_line / 2 > dist, length_line / 2 - dist, -(dist - length_line / 2));

    if (Round(segment_from_point['x'], 6) == Round(line_from_point['x'], 6) &&
        Round(segment_from_point['y'], 6) == Round(line_from_point['y'], 6)) {
        segment = offset(segment, -offset_dist);
    } else {
        segment = offset(segment, offset_dist);

    }
    return segment;
}

function is_even(value) {
    return (Number(value) % 2) == 0;
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

if (indexof(valid_asset_types, $feature.assettype) == -1) {
    return identifier;
}

if (IsEmpty(strand_count) || strand_count == 0) {
    return {'errorMessage': 'A value is required for the content count field'};
}

if (is_even(strand_count) == false) {
    return {'errorMessage': 'Fiber count must be even'};
}

// Get the from and to vertex of the line
var geo = Geometry($feature);
var line_len = length(geo);
var vertices = geo['paths'][0];
var sr = geo.spatialReference;
var from_point = vertices[0];
var to_point = vertices[-1];

var from_associated_features_by_strand = {};
var from_associated_features_for_splitter = null;
if (!IsEmpty($feature.FromGUID)) {
    var from_associated_features = null;
    var from_container_guid = $feature.FromGUID;
    var fs = get_features_switch_yard('Associations', ['TOGLOBALID'], false);
    var filtered_fs = Filter(fs, "fromglobalid = @from_container_guid and ASSOCIATIONTYPE = 2");
    var contained_ids = [];
    for (var feat in filtered_fs) {
        contained_ids[count(contained_ids)] = feat['TOGLOBALID']
    }
    if (Count(contained_ids) > 0) {
        var fs = get_features_switch_yard(device_class, ['Globalid', 'Strand'], true);
        if ($feature.FromAGAT == 'splice') {
            from_associated_features = Filter(fs, "globalid IN @contained_ids and tube = @identifier and " + splice_junction_sql);
            for (var feat in from_associated_features) {
                from_associated_features_by_strand[Text(feat['Strand'])] = Geometry(feat)
            }
        } else if ($feature.FromAGAT == 'splitter') {
            var line_fs = get_features_switch_yard(line_class, ['GlobalID'], true);
            from_associated_features = Filter(fs, "globalid IN @contained_ids and " + splitter_junction_sql);
            for (var feat in from_associated_features) {
                var intersection = Intersects(line_fs, feat);
                if (Count(intersection) == 0) {
                    from_associated_features_for_splitter = feat;
                    break
                }
            }
        }
    }
}


var to_associated_features_by_strand = {};
var to_associated_features_for_splitter = null;
if (!IsEmpty($feature.toGUID)) {
    var to_associated_features = null;
    var to_container_guid = $feature.toGUID;
    var fs = get_features_switch_yard('Associations', ['TOGLOBALID'], false);
    var filtered_fs = Filter(fs, "fromglobalid = @to_container_guid and ASSOCIATIONTYPE = 2");
    var contained_ids = [];
    for (var feat in filtered_fs) {
        contained_ids[count(contained_ids)] = feat['TOGLOBALID']
    }
    if (Count(contained_ids) > 0) {
        var fs = get_features_switch_yard(device_class, ['Globalid', 'Strand'], true);
        if ($feature.toAGAT == 'splice') {
            to_associated_features = Filter(fs, "globalid IN @contained_ids and tube = @identifier and " + splice_junction_sql);
            for (var feat in to_associated_features) {
                to_associated_features_by_strand[Text(feat['Strand'])] = Geometry(feat)
            }
        } else if ($feature.toAGAT == 'splitter') {
            var line_fs = get_features_switch_yard(line_class, ['GlobalID'], true);
            to_associated_features = Filter(fs, "globalid IN @contained_ids and " + splitter_junction_sql);
            for (var feat in to_associated_features) {
                var intersection = Intersects(line_fs, feat);
                if (Count(intersection) == 0) {
                    to_associated_features_for_splitter = feat;
                    break
                }
            }
        }
    }
}

var offset_dist = 0;
var perp_dist = .1;
var from_line = create_perp_line(from_point, geo, offset_dist, perp_dist);
//return (from_line)
from_line = adjust_z(from_line, identifier);
from_line = densify(from_line, (length(from_line) / strand_count))['paths'][0];
var vertex_cnt = count(from_line);

var new_from = [];
for (var v = 0; v < count(from_line); v++) {
    if (v == 0 || v == vertex_cnt - 1 || v % (vertex_cnt / strand_count) < 1) {
        new_from[Count(new_from)] = from_line[v]
    }
}
from_line = new_from;

var to_line = create_perp_line(to_point, geo, offset_dist, perp_dist);
//return (to_line)
to_line = adjust_z(to_line, identifier);
to_line = densify(to_line, (length(to_line) / strand_count))['paths'][0];
var vertex_cnt = count(to_line);

var new_to = [];
for (var v = 0; v < count(to_line); v++) {
    if (v == 0 || v == vertex_cnt - 1 || v % (vertex_cnt / strand_count) < 1) {
        new_to[Count(new_to)] = to_line[v]
    }
}
to_line = new_to;

var attributes = {};
var line_adds = [];
var junction_adds = [];

for (var j = 0; j < strand_count; j++) {
    attributes = {
        'AssetGroup': contained_features_AG,
        'AssetType': contained_features_AT,
        'Identifier': j + 1,
        'IsSpatial': 0,
        'FromAGAT': $feature.FromAGAT,
        'FromGUID': $feature.FromGUID,
        'ToAGAT': $feature.ToAGAT,
        'ToGUID': $feature.ToGUID
    };
    var line_shape = Dictionary(Text(Geometry($feature)));


    if ($feature.FromAGAT == 'splice') {
        var new_from_point = null;
        if (haskey(from_associated_features_by_strand, Text(j + 1))) {
            new_from_point = from_associated_features_by_strand[Text(j + 1)];
            new_from_point = [new_from_point.x, new_from_point.y, new_from_point.z, null];
            //return [new_from_point.x, new_from_point.y, new_from_point.z, null];
            //return line_shape['paths'][0][0] + ':' + new_from_point
        } else {
            var from_attributes = {
                'AssetGroup': junction_features_AG,
                'AssetType': junction_features_AT,
                'Tube': identifier,
                'Strand': j + 1,
                'ContainerGUID': $feature.FromGUID,
                'IsSpatial': 0,
            };

            junction_adds[Count(junction_adds)] = {
                'attributes': from_attributes,
                'geometry': from_line[j]
            };
            new_from_point = from_line[j];
        }
        line_shape['paths'][0][0] = new_from_point;//[new_from_point.x, new_from_point.y, new_from_point.z, null];
    }
    if ($feature.ToAGAT == 'splice') {
        var new_to_point = null;
        if (haskey(to_associated_features_by_strand, Text(j + 1))) {
            new_to_point = to_associated_features_by_strand[Text(j + 1)];
            new_to_point = [new_to_point.x, new_to_point.y, new_to_point.z, null];
        } else {
            var to_attributes = {
                'AssetGroup': junction_features_AG,
                'AssetType': junction_features_AT,
                'Tube': identifier,
                'Strand': j + 1,
                'ContainerGUID': $feature.ToGUID,
                'IsSpatial': 0,
            };

            junction_adds[Count(junction_adds)] = {
                'attributes': to_attributes,
                'geometry': to_line[j]
            };

            new_to_point = to_line[j]
        }
        line_shape['paths'][0][-1] = new_to_point;//[new_to_point.x, new_to_point.y, new_to_point.z, null];
    }
    line_adds[Count(line_adds)] = {
        'attributes': attributes,
        'geometry': Polyline(line_shape),
        'associationType': 'content'
    };

}
var edit_payload = [{'className': line_class, 'adds': line_adds}];
if (Count(junction_adds) > 0) {
    edit_payload[Count(edit_payload)] = {'className': device_class, 'adds': junction_adds}
}
return {
    "result": identifier,
    "edit": edit_payload
};
