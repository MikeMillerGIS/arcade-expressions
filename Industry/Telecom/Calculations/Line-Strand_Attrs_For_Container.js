// Assigned To: CommunicationsLine
// Type: Calculation
// Name: Populate strand attributes
// Description: Push updates to Cable Fiber attributes when Strand status changes.
// Subtypes: Strand
// Field: strandstatus
// Trigger: Update
// Exclude From Client: True
// Disable: False

//NOTES
// Will need to operate on delete and update fiber count?

// Related Rules: Some rules rely on additional rules for execution. If this rule works in conjunction with another, they are listed below:
//    -


// *************       User Variables       *************
// This section has the functions and variables that need to be adjusted based on your implementation

var strand_status = $feature.strandstatus;
var orig_strand_status = $originalfeature.strandstatus;

// Optionally limit rule to specific asset groups and asset types. If not specified, will be ignored.
var assettype_value = $feature.assettype;
var valid_asset_types = [];

var cable_class = "CommunicationsLine";

// var strand_status_type = {
//     0: 'Unknown',
//     1: 'Available',
//     2: 'In Use',
//     3: 'Reserved',
//     4: 'In Use - Dedicated',
//     5: 'Not usable',
//     6: 'Pending Customer Connect',
//     7: 'Pending Customer Disconnect'
// };

// Cable attributes
var strand_available = "strandavailable";
var strand_dedicated = "stranddedicated";
var strand_inuse = "strandinuse";
var strand_pendingconnect = "strandpendingconnect";
var strand_pendingdisconnect = "strandpendingdisconnect";
var strand_reserved = "strandreserved";
var strand_unusable = "strandunusable";


// Optionally change/add feature class names to match you implementation
function get_features_switch_yard(class_name, fields, include_geometry) {
    var class_name = Split(class_name, '.')[-1];
    var feature_set = null;
    if (class_name == "CommunicationsLine") {
        feature_set = FeatureSetByName($datastore, "CommunicationsLine", fields, include_geometry);
    }
    return feature_set;
}

// ************* End User Variables Section *************


// *************       Functions            *************

function get_contain_feature_ids(feature) {
    // Query to get all the container associations
    var associations = FeatureSetByAssociation(feature, "container");
    // If there is no content, exit the function
    if (Count(associations) == 0) {
        return null;
    }
    // loop over all associated records to get a list of the Cable class container IDs
    var associated_ids = [];
    for (var row in associations) {
        if (row.className == cable_class) {
            associated_ids[Count(associated_ids)] = row.globalId;
        }
    }
    //return a list of GlobalIDs of container cable features
    return associated_ids;
}

function get_cable_changes (old_status, new_status) {
    ret_dict = {
        strand_available: 0,
        strand_dedicated: 0,
        strand_inuse: 0,
        strand_pendingconnect: 0,
        strand_pendingdisconnect: 0,
        strand_reserved: 0,
        strand_unusable: 0
    };

    if (new_status == 1) {
        ret_dict[strand_available] = 1;}
    else if (new_status == 2) {
        ret_dict[strand_inuse] = 1;}
    else if (new_status == 3) {
        ret_dict[strand_reserved] = 1;}
    else if (new_status == 4) {
        ret_dict[strand_dedicated] = 1;}
    else if (new_status == 5) {
        ret_dict[strand_unusable] = 1;}
    else if (new_status == 6) {
        ret_dict[strand_pendingconnect] = 1;}
    else if (new_status == 7) {
        ret_dict[strand_pendingdisconnect] = 1}

    if (old_status == 1) {
        ret_dict[strand_available] = -1;}
    else if (old_status == 2) {
        ret_dict[strand_inuse] = -1;}
    else if (old_status == 3) {
        ret_dict[strand_reserved] = -1;}
    else if (old_status == 4) {
        ret_dict[strand_dedicated] = -1;}
    else if (old_status == 5) {
        ret_dict[strand_unusable] = -1;}
    else if (old_status == 6) {
        ret_dict[strand_pendingconnect] = -1;}
    else if (old_status == 7) {
        ret_dict[strand_pendingdisconnect] = -1;}

    return ret_dict
}


// ************* End Functions Section ******************

// If strandstatus did not change then exit
if (strand_status == orig_strand_status) {
    return strand_status;
}

// Limit the rule to valid asset types
if (Count(valid_asset_types) > 0 && IndexOf(valid_asset_types, assettype_value) == -1) {
    return strand_status;
}

var container_ids = get_contain_feature_ids($feature);
if (IsEmpty(container_ids)) {
    return strand_status;
}
var container_fs = get_features_switch_yard(cable_class,
    [strand_available, strand_dedicated, strand_inuse, strand_pendingconnect, strand_pendingdisconnect, strand_reserved, strand_unusable],
    false);

var cable_changes = get_cable_changes(strand_status, orig_strand_status);
// build payload with potentially more than one edit
var cable_updates = [];
for (var contain in container_ids) {
    attributes = {};
    var container_row = First(Filter(container_fs, "globalid = @contain"));
    var orig_strand_available = container_row[strand_available];
    var orig_strand_dedicated = container_row[strand_dedicated];
    var orig_strand_inuse = container_row[strand_inuse];
    var orig_strand_pendingconnect = container_row[strand_pendingconnect];
    var orig_strand_pendingdisconnect = container_row[strand_pendingdisconnect];
    var orig_strand_reserved = container_row[strand_reserved];
    var orig_strand_unusable = container_row[strand_unusable];
    attributes = {
        strand_available = orig_strand_available + cable_changes[strand_available],
        strand_dedicated = orig_strand_dedicated + cable_changes[strand_dedicated],
        strand_inuse = orig_strand_inuse + cable_changes[strand_inuse],
        strand_pendingconnect = orig_strand_pendingconnect + cable_changes[strand_pendingconnect],
        strand_pendingdisconnect = orig_strand_pendingdisconnect + cable_changes[strand_pendingdisconnect],
        strand_reserved = orig_strand_reserved + cable_changes[strand_reserved],
        strand_unusable = orig_strand_unusable + cable_changes[strand_unusable]
    };

    cable_updates[Count(cable_updates)] = {'globalID': contain,
                                           'attributes': attributes};
}

var edit_payload = [
    {'className': cable_class,
     'updates': cable_updates}];

return {
    "result": strand_status,
    "edit": edit_payload
};


