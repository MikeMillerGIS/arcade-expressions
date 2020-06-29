// Assigned To: CommunicationsDevice
// Type: Calculation
// Name: Contain Splice Ports in Splice Enclosure
// Description: Contain Splice Ports in Splice Enclosure using the ContainerGuid field
// Subtypes: Splice
// Field: assetid
// Trigger: Insert
// Exclude From Client: True
// Disable: False

// *************       User Variables       *************
// This section has the functions and variables that need to be adjusted based on your implementation

var assigned_to_field = $feature.assetid;
var valid_asset_types = [143];
var use_device_as_container = false;
var device_class = "CommunicationsDevice";

if (use_device_as_container == true) {
    var container_class = device_class;
} else {
    var container_class = "CommunicationsAssembly";
}

// ************* End User Variables Section *************

var container_guid = $feature.containerGUID;
var asset_type = $feature.assettype;
if (IsEmpty(container_guid) || indexof(valid_asset_types, asset_type) == -1) {
    return assigned_to_field;
}

var edit_payload = [{
    'className': container_class,
    'updates': [{
        'globalID': $feature.containerGUID,
        'associationType': 'container'
    }]
}];

return {"result": assigned_to_field, "edit": edit_payload};