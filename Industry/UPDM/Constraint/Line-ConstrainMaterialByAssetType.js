// Assigned To: PipelineLine
// Type: Constraint
// Name: Limit Material By Asset Type
// Description: Limit values
// Subtypes: All
// Error: 5601
// Error Message: Incompatible types for ASSETGROUP, assettype, material
// Execute: Insert, Update


// ***************************************
// This section has the functions and variables that need to be adjusted based on your implementation

var valid_asset_groups = [1,2,3,4,5,6,7];
if (indexof(valid_asset_groups, $feature.ASSETGROUP) == -1) {
    return true;
}

var valid_values = { '1': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '10': ['J', '<NULL>', 'UN', 'X'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['T', 'U', '<NULL>', 'UN', 'X', 'V'],
         '5': ['X', '<NULL>', 'UN'],
         '6': ['S', '<NULL>', 'UN', 'X'],
         '7': ['<NULL>', 'X', 'UN'],
         '8': ['<NULL>', 'UN', 'X'],
         '9': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'UN', '<NULL>', 'X']},
  '2': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '10': ['J', '<NULL>', 'UN', 'X'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['T', 'U', '<NULL>', 'UN', 'X', 'V'],
         '5': ['X', '<NULL>', 'UN'],
         '6': ['S', '<NULL>', 'UN', 'X'],
         '7': ['<NULL>', 'X', 'UN'],
         '8': ['<NULL>', 'UN', 'X'],
         '9': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'UN', '<NULL>', 'X']},
  '3': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['T', 'U', '<NULL>', 'UN', 'X', 'V'],
         '6': ['S', '<NULL>', 'UN', 'X']},
  '4': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '10': ['J', '<NULL>', 'UN', 'X'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['T', 'U', '<NULL>', 'UN', 'X', 'V'],
         '6': ['S', '<NULL>', 'UN', 'X'],
         '7': ['<NULL>', 'X', 'UN'],
         '8': ['<NULL>', 'UN', 'X'],
         '9': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'UN', '<NULL>', 'X']},
  '5': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['T', 'U', '<NULL>', 'UN', 'X', 'V'],
         '6': ['S', '<NULL>', 'UN', 'X']},
  '6': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '10': ['J', '<NULL>', 'UN', 'X'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['T', 'U', '<NULL>', 'UN', 'X', 'V'],
         '6': ['S', '<NULL>', 'UN', 'X'],
         '7': ['<NULL>', 'X', 'UN'],
         '8': ['<NULL>', 'UN', 'X'],
         '9': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'UN', '<NULL>', 'X']},
  '7': { '1': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '11': ['<NULL>', 'O', 'UN', 'X'],
         '12': ['R', '<NULL>', 'UN', 'X'],
         '2': ['<NULL>', 'UN', 'O', 'X'],
         '3': ['UN', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'M', 'N', 'X', '<NULL>'],
         '4': ['<NULL>', 'UN', 'X'],
         '6': ['S', '<NULL>', 'UN', 'X']}};
// ************* End Section *****************
var fields = ['ASSETGROUP','assettype','material'];
var dict_values = valid_values
var error_msg = {"errorMessage": "The selected attributes for ASSETGROUP, assettype, material are not valid."}
for (var i = 0; i < Count(fields) - 2; i++) {
    var field_value = $feature[fields[i]];
    field_value = iif(IsEmpty(field_value), '<NULL>', Text(field_value));

    if (HasKey(dict_values, field_value)) {
        dict_values = dict_values[field_value]
        if (typeof (dict_values) == 'Array') {
            field_value = $feature[fields[i]];
            field_value = iif(IsEmpty(field_value), '<NULL>', Text(field_value));
            if (IndexOf(dict_values, field_value) == -1) {
                return error_msg
            }
        }
    } else {
        return error_msg
    }
}
return true;