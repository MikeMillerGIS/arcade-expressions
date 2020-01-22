# Rotate Feature by Intersected Line

This calculation attribute rule split a line when a point is placed

## Use cases

Split a water main when a valve is placed

## Workflow

Using ArcGIS Pro, use the Add Attribute Rule geoprocessing tool to define this rule on a feature class and optionally on a subtype in that feature class.  Use the following values when defining the rule, the other options are not required or depend on your situation.
  
  - **Rule Type:** Calculation
  - **Triggering Events:** Update

## Expression Template

This Arcade expression will split a line when a point is placed


```js
// Split the intersecting line

// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation

// The field the rule is assigned to
var field_value = 'Feild'//Text($feature.ValueCopied);
// The line class to split
var lineClass = FeatureSetByName($datastore, "Line", ["objectid"], true);

// ************* End Section *****************

function dist_to_line(start_coord, end_coord, point_coord) {
    var Dx = end_coord[0] - start_coord[0];
    var Dy = end_coord[1] - start_coord[1];
    return ABS(Dy * point_coord[0] - Dx * point_coord[1] - start_coord[0] * end_coord[1] + end_coord[0] * start_coord[1]) / SQRT(POW(Dx, 2) + POW(Dy, 2));
}

function compare_coordinate(source_geo, coordinate) {
    // TODO, probably move to Equals and compare the geometry
    if (Round(coordinate[0], 2) != Round(source_geo.X, 2) ||
        Round(coordinate[1], 2) != Round(source_geo.Y, 2)) {
        return false
    }
    return true;
    // TODO - Figure out Z
    if (Count(coordinate > 2) && IsEmpty(source_geo.Z) == false) {
        if (Round(coordinate[2], 2) != Round(source_geo.Z, 2)) {
            return false
        }
    }
    return true
}

var intersecting_lines = Intersects(lineClass, $feature);
// If no features were found, return the original value
if (IsEmpty(intersecting_lines) || Count(intersecting_lines) == 0) {
    return field_value;
}
var point_geo = Geometry($feature);

var update_features = [];
var new_features = [];
var interpolate_z = false;
for (var feat in intersecting_lines) {
    var line_geo = Geometry(feat);
    var line_shape = Dictionary(Text(line_geo));
    // Handle case where line has Z and Point has Z
    var point_coord = null;
    if (Count(line_shape['paths'][0][0]) >= 3 && IsEmpty(point_geo.Z)) {
        point_coord = [point_geo.X, point_geo.Y];
        interpolate_z = true
    } else if (Count(line_shape['paths'][0][0]) >= 3 && IsEmpty(point_geo.Z) == false) {
        point_coord = [point_geo.X, point_geo.Y, point_geo.Z];
    } else {
        point_coord = [point_geo.X, point_geo.Y];
    }
    // If the point is at the start or end, skip splitting line
    if (compare_coordinate(point_geo, line_shape['paths'][0][0]) || compare_coordinate(point_geo, line_shape['paths'][-1][-1])) {
        continue;
    }
    var split_found = false;
    var new_shape_1 = [];
    var new_shape_2 = [];
    var split_found = false;

    for (var i in line_shape['paths']) {
        var current_path = line_shape['paths'][i];

        var new_path_1 = [];
        var new_path_2 = [];

        for (var j in current_path) {
            if (split_found == true) {
                new_path_2[Count(new_path_2)] = current_path[j];
                continue
            }
            // Add the coordinate to both features if the split is on the from
            if (compare_coordinate(point_geo, current_path[j])) {
                new_path_1[Count(new_path_1)] = point_coord;
                new_path_2[Count(new_path_2)] = point_coord;
                split_found = true;
                continue;
            }

            // Save the last coordinate
            if (Count(current_path) == j - 1) {
                new_path_1[Count(new_path_1)] = current_path[j];
                continue;
            }
            // If the To is the last coordinate and matches the point, continue
            if (compare_coordinate(point_geo, current_path[j + 1])) {
                new_path_1[Count(new_path_1)] = current_path[j];
                continue;
            }

            var from_coord = current_path[j];
            var to_coord = current_path[j + 1];

            if (dist_to_line(from_coord, to_coord, point_coord) < .01) {
                new_path_1[Count(new_path_1)] = current_path[j];
                new_path_1[Count(new_path_1)] = point_coord;
                // Start the next line
                new_path_2[Count(new_path_2)] = point_coord;
                split_found = true;
                continue
            }
            new_path_1[Count(new_path_1)] = current_path[j];

        }
        if (Count(new_path_1) > 0) {
            new_shape_1[Count(new_shape_1)] = new_path_1;
        }
        if (Count(new_path_2) > 0) {
            new_shape_2[Count(new_shape_2)] = new_path_2;
        }
    }
    return Text(new_shape_1);
    return Text(new_shape_2);
}
// Set to true if the rotation setting is set to geographic in the layer properties
var geographic_rotation = false;
// Set the counter clockwise spin angle used for the symbol in the symbology options
var symbol_flip_angle = 0
// Return if a value is already set, to recalculate an angle, the field must be set to null
if (IsEmpty($feature.symbolrotation) == false) {
    return $feature.symbolrotation;
}

// Create a feature set to the line layer
var lineClass = FeatureSetByName($datastore, "lines", ["objectid"], true);
// Find the intersecting lines
var lines = Intersects(lineClass, $feature);
//If no lines intersect, return the original value
if (Count(lines) == 0) {
    return $feature.symbolrotation;
}
var diff_tol = 5;
// Variable to store all found angles
var angles = [];
// Store the features geometry
var feature_geometry = Geometry($feature);
// Loop over all intersecting lines and find their angles
var angle_type;
var angle_value;
for (var line in lines) {
    // Buffer and create an extenf of the point by a small amount to extract the segment
    var clip_area = Extent(Buffer($feature, .01, "meter"));
    // Clip the line by the extend and get the first line segment
    var segment = Clip(line, clip_area)["paths"][0];
    // The features location is on the start of the line, get the angle from the feature to the end vertex
    if (Equals(segment[0], feature_geometry)) {
        angle_type = 'from'
        angle_value = Round(Angle(feature_geometry, segment[-1]), 0)
    }
    // The features location is on the end of the line, create a new segment from the feature to the start vertex
    else if (Equals(segment[-1], feature_geometry)) {
        angle_type = 'to'
        angle_value = Round(Angle(feature_geometry, segment[0]), 0)
    }
    // The features location is midspan of the segment, use the angle of the segment
    else {
        angle_type = 'mid'
        angle_value = Round(Angle(segment[0], segment[-1]), 0)
    }
    if (geographic_rotation == true) {
        // Convert Arithmetic to Geographic
        angle_value = (450 - angle_value) % 360;
    }
    // Add 180 to match 0 rotation in the TOC
    // Add user specified spin angle if their symbol is rotated
    angle_value = (angle_value + 180 + symbol_flip_angle) % 360;
    angles[Count(angles)] = {'angle': angle_value, 'type': angle_type};
}

// If only one angle, return that value
if (Count(angles) == 1) {
    // If the point is midspan, flip to match symbol as it if was on the end point
    if (angles[0]['type'] == 'mid')
    {
        return (angles[0]['angle'] + 180) % 360;
    }
    return angles[0]['angle'];
} else if (Count(angles) == 2) {
    // If the feature is midpan of the first line, return the angle of the second line
    if (angles[0]['type'] == 'mid')
        return angles[1]['angle'];
    // If the feature is midpan of the second line, return the angle of the first line
    else if (angles[1]['type'] == 'mid')
        return angles[0]['angle'];
    // If the feature is at the end point of both lines, return the angle of the first line
    else if (angles[0]['type'] == 'to' && angles[1]['type'] == 'to') {
        return angles[0]['angle'];
    }
    // If the feature is at the start point of both lines, return the angle of the first line
    else if (angles[0]['type'] == 'from' && angles[1]['type'] == 'from') {
        return angles[0]['angle'];
    }
    // If the feature is at the start point of the first line and end of the second line, return the second line
    else if (angles[0]['type'] == 'from') {
        return angles[1]['angle'];
    }
    // If the feature is at the start point of the second line and start of the second line, return the first line
    return angles[0]['angle'];

} else if (Count(angles) == 3) {
    // Flatten the angles to ignore direction
    var flat_angle1 = angles[0]['angle'] % 180;
    var flat_angle2 = angles[1]['angle'] % 180;
    var flat_angle3 = angles[2]['angle'] % 180;
    // Create differences between angles
    var angle_dif_a = Abs(flat_angle1 - flat_angle2);
    var angle_dif_b = Abs(flat_angle1 - flat_angle3);
    var angle_dif_c = Abs(flat_angle2 - flat_angle3);
    // If difference between line 1 and 2 is below the tolerance, meaning the lines follow the ame plane, return the
    // third line
    if (angle_dif_a <= (diff_tol * 2) || angle_dif_a >= (180 - (diff_tol * 2))) {
        return angles[2]['angle'];
    }
    // If difference between line 1 and 3 is below the tolerance, meaning the lines follow the ame plane, return the
    // second line
    else if (angle_dif_b <= (diff_tol * 2) || angle_dif_b >= (180 - (diff_tol * 2))) {
        return angles[1]['angle'];

    }
    // If difference between line 2 and 3 is below the tolerance, meaning the lines follow the ame plane, return the
    // first line
    else if (angle_dif_c <= (diff_tol * 2) || angle_dif_c >= (180 - (diff_tol * 2))) {
        return angles[0]['angle'];
    }
    // Return first if not covered above
    return angles[0]['angle'];
}
// All other cases, the first feature is returned
else {
    return angles[0]['angle'];
}
```