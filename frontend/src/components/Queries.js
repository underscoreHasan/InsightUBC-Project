const query1 = {
	"WHERE": {
		"IS": {
			"datasetName_dept": "*"
		}
	},
	"OPTIONS": {
		"COLUMNS": [
			"datasetName_dept",
			"avg"
		],
		"ORDER": {
			"dir": "DOWN",
			"keys": ["datasetName_dept"]
		}
	},
	"TRANSFORMATIONS": {
		"GROUP": ["datasetName_dept"],
		"APPLY": [
			{
				"avg": {
					"AVG": "datasetName_avg"
				}
			}
		]
	}
};

const query2 = {
	"WHERE": {
		"IS": {
			"datasetName_dept": "*"
		}
	},
	"OPTIONS": {
		"COLUMNS": [
			"datasetName_dept",
			"numFails"
		],
		"ORDER": {
			"dir": "DOWN",
			"keys": ["numFails"]
		}
	},
	"TRANSFORMATIONS": {
		"GROUP": ["datasetName_dept"],
		"APPLY": [
			{
				"numFails": {
					"COUNT": "datasetName_fail"
				}
			}
		]
	}
};

const query3 = {
	"WHERE": {
		"OR": [
			{
				"IS": {
					"datasetName_dept": "math"
				}
			},
			{
				"IS": {
					"datasetName_dept": "cpsc"
				}
			},
			{
				"IS": {
					"datasetName_dept": "stat"
				}
			}
		]
	},
	"OPTIONS": {
		"COLUMNS": [
			"datasetName_dept",
			"numFails",
			"numPass",
			"numAudits"
		],
		"ORDER": {
			"dir": "DOWN",
			"keys": ["datasetName_dept"]
		}
	},
	"TRANSFORMATIONS": {
		"GROUP": ["datasetName_dept"],
		"APPLY": [
			{
				"numFails": {
					"COUNT": "datasetName_fail"
				}
			},
			{
				"numPass": {
					"COUNT": "datasetName_pass"
				}
			},
			{
				"numAudits": {
					"COUNT": "datasetName_audit"
				}
			}
		]
	}
};

// Function to replace 'datasetName' in the query objects
function replaceDatasetName(query, datasetName) {
	const queryString = JSON.stringify(query);

	// Replace all occurrences of 'datasetName' with the actual datasetName parameter
	const modifiedQueryString = queryString.replace(/datasetName/g, datasetName);

	// Parse the modified query back to an object
	return JSON.parse(modifiedQueryString);
}

function BuildQueries(datasetName) {
	const modifiedQuery1 = replaceDatasetName(query1, datasetName);
	const modifiedQuery2 = replaceDatasetName(query2, datasetName);
	const modifiedQuery3 = replaceDatasetName(query3, datasetName);

	return modifiedQuery1;
}

export default BuildQueries;
