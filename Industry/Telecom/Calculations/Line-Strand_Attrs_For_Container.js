// Assigned To: CommunicationsLine
// Type: Calculation
// Name: Populate strand attributes
// Description: Update strand attibutes of Cable when Strand status changes in a content Strand.
// Subtypes: Strand
// Field: strandstatus
// Trigger: Update
// Exclude From Client: True
// Disable: False

// Related Rules: Some rules rely on additional rules for execution. If this rule works in conjunction with another, they are listed below:
//    - None

// Duplicated in: This rule may be implemented on other classes, they are listed here to aid you in adjusting those rules when a code change is required.
//    - None

// *************       User Variables       *************
// This section has the functions and variables that need to be adjusted based on your implementation

// The strand status field which is the field the rule is assigned to.
// ** Implementation Note: Different states of strandstatus are compared to determine if strandstatus has been changed.
//    Adjust only if strand status field name differs.
var strand_status = $feature.strandstatus;
var orig_strand_status = $originalfeature.strandstatus;

// Optionally limit rule to specific asset types.
// ** Implementation Note: Add to list too limit rule to specific asset types. If not specified, will be ignored.
var assettype_value = $feature.assettype;
var valid_asset_types = [];

// The class name of the container Cable
// ** Implementation Note: This is just the class name and should not be fully qualified. Adjust this only if class name differs.
var cable_class = "CommunicationsLine";

// Cable strand attributes which will be updated if strand status changes
// ** Implementation Note: Adjust only if strand attribute fields differ
var strands_available = "strandsavailable";
var strands_dedicated = "strandsdedicated";
var strands_inuse = "strandsinuse";
var strands_pendingconnect = "strandspendingconnect";
var strands_pendingdisconnect = "strandspendingdisconnect";
var strands_reserved = "strandsreserved";
var strands_unusable = "strandsunusable";


// The FeatureSetByName function requires a string literal for the class name.  These are just the class name and should not be fully qualified
// ** Implementation Note: Optionally change/add feature class names to match you implementation
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
    if (Text(associated_ids) == '[]') {
        return null;
    }
    //return a list of GlobalIDs of container cable features
    return associated_ids;
}

function get_cable_changes (old_status, new_status) {
    var ret_dict = Dictionary(
        strands_available, 0,
        strands_dedicated, 0,
        strands_inuse, 0,
        strands_pendingconnect, 0,
        strands_pendingdisconnect, 0,
        strands_reserved, 0,
        strands_unusable, 0
    );

    if (new_status == 1) {
        ret_dict[strands_available] = 1;}
    else if (new_status == 2) {
        ret_dict[strands_inuse] = 1;}
    else if (new_status == 3) {
        ret_dict[strands_reserved] = 1;}
    else if (new_status == 4) {
        ret_dict[strands_dedicated] = 1;}
    else if (new_status == 5) {
        ret_dict[strands_unusable] = 1;}
    else if (new_status == 6) {
        ret_dict[strands_pendingconnect] = 1;}
    else if (new_status == 7) {
        ret_dict[strands_pendingdisconnect] = 1}

    if (old_status == 1) {
        ret_dict[strands_available] = -1;}
    else if (old_status == 2) {
        ret_dict[strands_inuse] = -1;}
    else if (old_status == 3) {
        ret_dict[strands_reserved] = -1;}
    else if (old_status == 4) {
        ret_dict[strands_dedicated] = -1;}
    else if (old_status == 5) {
        ret_dict[strands_unusable] = -1;}
    else if (old_status == 6) {
        ret_dict[strands_pendingconnect] = -1;}
    else if (old_status == 7) {
        ret_dict[strands_pendingdisconnect] = -1;}

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
    [strands_available, strands_dedicated, strands_inuse, strands_pendingconnect, strands_pendingdisconnect, strands_reserved, strands_unusable],
    false);

var cable_changes = get_cable_changes(orig_strand_status, strand_status);
//return{'errorMessage': Text(cable_changes)};
// build payload with potentially more than one edit
var cable_updates = [];
for (var idx in container_ids) {
    var attributes = {};
    var cont_id = container_ids[idx];
    var container_row = First(Filter(container_fs, "globalid = @cont_id"));
    var orig_strands_available = container_row[strands_available];
    var orig_strands_dedicated = container_row[strands_dedicated];
    var orig_strands_inuse = container_row[strands_inuse];
    var orig_strands_pendingconnect = container_row[strands_pendingconnect];
    var orig_strands_pendingdisconnect = container_row[strands_pendingdisconnect];
    var orig_strands_reserved = container_row[strands_reserved];
    var orig_strands_unusable = container_row[strands_unusable];
    if (cable_changes[strands_available] != 0) {
        attributes[strands_available] = orig_strands_available + cable_changes[strands_available];
    }
    if (cable_changes[strands_dedicated] != 0) {
        attributes[strands_dedicated] = orig_strands_dedicated + cable_changes[strands_dedicated];
    }
    if (cable_changes[strands_inuse] != 0) {
        attributes[strands_inuse] = orig_strands_inuse + cable_changes[strands_inuse];
    }
    if (cable_changes[strands_pendingconnect] != 0) {
        attributes[strands_pendingconnect] = orig_strands_pendingconnect + cable_changes[strands_pendingconnect];
    }
    if (cable_changes[strands_pendingdisconnect] != 0) {
        attributes[strands_pendingdisconnect] = orig_strands_pendingdisconnect + cable_changes[strands_pendingdisconnect];
    }
    if (cable_changes[strands_reserved] != 0) {
        attributes[strands_reserved] = orig_strands_reserved + cable_changes[strands_reserved];
    }
    if (cable_changes[strands_unusable] != 0) {
        attributes[strands_unusable] = orig_strands_unusable + cable_changes[strands_unusable];
    }
    cable_updates[Count(cable_updates)] = {'globalID': cont_id,
                                           'attributes': attributes};
}

var edit_payload = [
    {'className': cable_class,
     'updates': cable_updates}];

return {
    "result": strand_status,
    "edit": edit_payload
};
