// This rule will generate contained spatial/non spatial features
// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation
var valid_asset_types = [21];

var identifier = $feature.Identifier;
var line_class = 'CommunicationsLine';
var device_class = 'CommunicationsDevice';
var strand_count = $feature.ContentCount;

var sql_snap_types = {
    'splitter': 'AssetGroup = 8 AND AssetType = 73',
    'splice': 'AssetGroup = 8 AND AssetType = 72',
    'pass-through': 'AssetGroup = 8 AND AssetType = 66'
};

var strands_AG = 9;
var strands_AT = 163;
var strand_sql = 'AssetGroup = 9 AND AssetType = 163';

var junction_features_AG = 8;
var junction_features_AT = 72;


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
    if (points_snapped(segment_from_point, line_from_point)) {
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

function generate_offset_line(point_geo, line_geo, densify_tolerance, z_value) {
    var offset_dist = 0;
    var perp_dist = .1;
    var prep_line = create_perp_line(point_geo, line_geo, offset_dist, perp_dist);

    prep_line = adjust_z(prep_line, z_value);
    prep_line = densify(prep_line, (length(prep_line) / densify_tolerance))['paths'][0];
    var vertex_cnt = count(prep_line);
    var new_vertex = [];
    for (var v = 0; v < count(prep_line); v++) {
        if (v == 0 || v == vertex_cnt - 1 || v % (vertex_cnt / densify_tolerance) < 1) {
            new_vertex[Count(new_vertex)] = prep_line[v]; //[prep_line[v]['x'], prep_line[v]['y'], prep_line[v]['z'], null]
        }
    }
    return new_vertex

}

function get_line_ends(container_guid, container_type) {
    var move_line_to_geo = {};
    if (!IsEmpty(container_guid)) {
        var port_features = null;
        var new_geo = null;
        var assoc_fs = get_features_switch_yard('Associations', ['TOGLOBALID'], false);
        var filtered_fs = Filter(assoc_fs, "fromglobalid = @container_guid and ASSOCIATIONTYPE = 2");
        var contained_ids = [];
        for (var feat in filtered_fs) {
            contained_ids[count(contained_ids)] = feat['TOGLOBALID']
        }
        if (Count(contained_ids) > 0) {
            var fs = get_features_switch_yard(device_class, ['Globalid', 'Strand'], true);
            if (container_type == 'splice') {
                port_features = Filter(fs, "globalid IN @contained_ids and tube = @identifier and " + sql_snap_types[container_type]);
                for (var port_feat in port_features) {
                    new_geo = Geometry(port_feat);
                    move_line_to_geo[Text(port_feat['Strand'])] = new_geo; //[new_geo.x, new_geo.y, new_geo.z, null];
                }
            } else if (container_type == 'splitter') {
                // If the cable is snapped to a splitter, look for the next open port and return its geometry, all strands get snapped to the the same location
                var line_fs = Filter(get_features_switch_yard(line_class, ['GlobalID'], true), strand_sql);
                port_features = Filter(fs, "globalid IN @contained_ids and " + sql_snap_types[container_type]);
                var scale_to_all_strands = null;
                // Loop through all valid ports in the container
                for (var port_feat in port_features) {
                    // Intersect the existing strands to find a port without a strand connected to it
                    var intersection = Intersects(line_fs, port_feat);
                    new_geo = Geometry(port_feat);
                    if (Count(intersection) == 0) {
                        // No strands are connected, store the geometry to scale to all strands
                        scale_to_all_strands = new_geo;//[new_geo.x, new_geo.y, new_geo.z, null];
                        break;
                    } else {
                        // Port intersects a strand, filter to make sure it is only end/start snapping
                        var line_on_end = false;
                        for (var line_feat in intersection) {
                            var line_geo_strand = Geometry(line_feat);
                            line_on_end = point_on_start_end(new_geo, line_geo_strand);
                            // If the line/strand is snapped at a end/start, move to next port
                            if (line_on_end) {
                                continue;
                            }
                            // Line is not snapped at end/start, store and exit loop, no need to check additional ports
                            scale_to_all_strands = new_geo;//[new_geo.x, new_geo.y, new_geo.z, null];
                            break;
                        }
                    }

                }
                if (!IsEmpty(scale_to_all_strands)) {
                    move_line_to_geo['singleport'] = scale_to_all_strands
                }
            } else if (container_type == 'pass-through') {
                // If the cable is snapped to a cable termination, look for the next open port and return its geometry, each strand will be snapped to the next open port
                var line_fs = Filter(get_features_switch_yard(line_class, ['GlobalID'], true), strand_sql);
                port_features = Filter(fs, "globalid IN @contained_ids and " + sql_snap_types[container_type]);
                var i = 0;
                // Loop through all valid ports in the container
                for (var port_feat in port_features) {
                    // Intersect the existing strands to find a port without a strand connected to it
                    var intersection = Intersects(line_fs, port_feat);
                    new_geo = Geometry(port_feat);
                    if (Count(intersection) == 0) {
                        // No strands are connected, store the geometry of the open port
                        move_line_to_geo[Text(i)] = new_geo;//[new_geo.x, new_geo.y, new_geo.z, null];
                        i++;
                    } else {
                        // Port intersects a strand, filter to make sure it is only end/start snapping
                        var line_on_end = false;
                        for (var line_feat in intersection) {
                            var line_geo_strand = Geometry(line_feat);
                            line_on_end = point_on_start_end(new_geo, line_geo_strand);
                            // If the line/strand is snapped at a end/start, move to next port
                            if (line_on_end) {
                                continue;
                            }
                            // Line is not snapped at end/start, store and exit loop, no need to check additional ports
                            move_line_to_geo[Text(i)] = new_geo;//[new_geo.x, new_geo.y, new_geo.z, null];
                            i++;
                        }
                    }

                }
            }
        }
    }
    return move_line_to_geo

}

function points_snapped(point_a, point_b) {
    return (Round(point_a['x'], 6) == Round(point_b['x'], 6) &&
        Round(point_a['y'], 6) == Round(point_b['y'], 6) &&
        Round(point_a['z'], 6) == Round(point_b['z'], 6))

}

function point_on_start_end(point_geo, line_geo) {
    //if (Within(new_geo, Geometry(line_feat))) {
    //     line_on_end = true;
    //     break;
    // }
    var vertices = line_geo['paths'][0];
    var from_point = vertices[0];
    var to_point = vertices[-1];

    // Compare the start and end points
    if (points_snapped(point_geo, to_point)) {
        return true
    } else if (points_snapped(point_geo, from_point)) {
        return true
    }
    return false

}

function point_to_array(point_geo) {
    return [point_geo['x'], point_geo['y'], point_geo['z']]
}

function splice_end_point(port_features, prep_line_offset, vertex_index, container_guid) {
    var new_point = null;
    var new_feature = null;
    if (haskey(port_features, Text(vertex_index + 1))) {
        new_point = port_features[Text(vertex_index + 1)];
    } else {
        var new_feature_attributes = {
            'AssetGroup': junction_features_AG,
            'AssetType': junction_features_AT,
            'Tube': identifier,
            'Strand': vertex_index + 1,
            'ContainerGUID': container_guid,
            'IsSpatial': 0,
        };

        new_feature = {
            'geometry': prep_line_offset[vertex_index],
            'attributes': new_feature_attributes
        };
        new_point = prep_line_offset[vertex_index];
    }
    return [new_point, new_feature]
}

// Validation

// Limit the rule to valid subtypes
if (indexof(valid_asset_types, $feature.assettype) == -1) {
    return identifier;
}

// Require a value for strand count
if (IsEmpty(strand_count) || strand_count == 0) {
    return {'errorMessage': 'A value is required for the content count field'};
}

// Fiber count must be event
if (is_even(strand_count) == false) {
    return {'errorMessage': 'Fiber count must be even'};
}

// Get the from and to vertex of the line
var geo = Geometry($feature);
var vertices = geo['paths'][0];
var from_point = vertices[0];
var to_point = vertices[-1];

// Get the from and to features the strands need to be adjusted too
var from_port_features = get_line_ends($feature.FromGUID, $feature.FromAGAT);
var to_port_features = get_line_ends($feature.ToGUID, $feature.ToAGAT);

// Generate offset lines to move strands to when no port is found
var from_offset_line = generate_offset_line(from_point, geo, strand_count, 100);
var to_offset_line = generate_offset_line(to_point, geo, strand_count, 100);

var attributes = {};
var line_adds = [];
var junction_adds = [];


for (var j = 0; j < strand_count; j++) {
    attributes = {
        'AssetGroup': strands_AG,
        'AssetType': strands_AT,
        'Identifier': j + 1,
        'IsSpatial': 0,
        'FromAGAT': $feature.FromAGAT,
        'FromGUID': $feature.FromGUID,
        'ToAGAT': $feature.ToAGAT,
        'ToGUID': $feature.ToGUID
    };
    var line_shape = Dictionary(Text(Geometry($feature)));

    if ($feature.FromAGAT == 'splice') {

        var splice_from_info = splice_end_point(from_port_features, from_offset_line, j, $feature.FromGUID);
        if (!IsEmpty(splice_from_info[0])) {
            line_shape['paths'][0][0] = point_to_array(splice_from_info[0]);
        } else {
            line_shape['paths'][0][0] = point_to_array(from_offset_line[j]);
        }
        if (!IsEmpty(splice_from_info[1])) {
            junction_adds[Count(junction_adds)] = splice_from_info[1];
        }

    } else if ($feature.FromAGAT == 'splitter') {
        if (HasKey(from_port_features, 'singleport')) {
            line_shape['paths'][0][0] = point_to_array(from_port_features['singleport']);
        } else {
            line_shape['paths'][0][0] = point_to_array(from_offset_line[j]);
        }
    } else if ($feature.FromAGAT == 'pass-through') {

        if (HasKey(from_port_features, Text(j))) {
            line_shape['paths'][0][0] = point_to_array(from_port_features[Text(j)]);
        } else {
            line_shape['paths'][0][0] = point_to_array(from_offset_line[j]);
        }
    } else {
        line_shape['paths'][0][0] = point_to_array(from_offset_line[j]);
    }

    if ($feature.ToAGAT == 'splice') {
        var splice_to_info = splice_end_point(to_port_features, to_offset_line, j, $feature.ToGUID);
        if (!IsEmpty(splice_to_info[0])) {
            line_shape['paths'][0][-1] = point_to_array(splice_to_info[0]);
        } else {
            line_shape['paths'][0][-1] = point_to_array(to_offset_line[j]);
        }
        if (!IsEmpty(splice_to_info[1])) {
            junction_adds[Count(junction_adds)] = splice_to_info[1];
        }
    } else if ($feature.ToAGAT == 'splitter') {
        if (HasKey(to_port_features, 'singleport')) {
            line_shape['paths'][0][-1] = point_to_array(to_port_features['singleport']);
        } else {
            line_shape['paths'][0][-1] = point_to_array(to_offset_line[j]);
        }
    } else if ($feature.ToAGAT == 'pass-through') {
        if (HasKey(to_port_features, Text(j))) {
            line_shape['paths'][0][-1] = point_to_array(to_port_features[Text(j)]);
        } else {
            line_shape['paths'][0][-1] = point_to_array(to_offset_line[j]);
        }
    } else {
        line_shape['paths'][0][-1] = point_to_array(to_offset_line[j]);
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
