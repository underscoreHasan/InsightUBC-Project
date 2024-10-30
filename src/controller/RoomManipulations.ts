import { InsightError } from "./IInsightFacade";

export const validRoomSet = new Set([
	"fullname",
	"shortname",
	"number",
	"name",
	"address",
	"lat",
	"lon",
	"seats",
	"type",
	"furniture",
	"href",
]);

export function validateRooms(options: any): string {
	//iterate through column and validate
	const columns = options.COLUMNS;
	const order = options.ORDER;
	const applyKeys = new Set<string>();
	let datasetID: string | null = null;

	// validate columns, make sure only one dataset but can have applykeys so add those
	columns.forEach((column: any) => {
		if (column.includes("_")) {
			const [curDataset, curField] = column.split("_");
			if (datasetID && datasetID !== curDataset) {
				throw new InsightError("Multiple datasets in columns");
			}
			if (curDataset && !validRoomSet.has(curField)) {
				throw new InsightError("Invalid room key in columns");
			}

			datasetID = datasetID || curDataset;
		} else {
			applyKeys.add(column);
		}
	});

	//validate order
	validateOrder(columns, order, applyKeys, datasetID);

	if (datasetID) {
		return datasetID;
	} else {
		return "";
	}
}

function validateOrder(columns: any, order: any, applyKeys: Set<string>, datasetID: string | null): void {
	//validate order
	if (typeof order === "string") {
		if (!columns.includes(order) && !applyKeys.has(order)) {
			throw new InsightError("ORDER key must be part of COLUMNS or an apply key");
		}
	} else if (typeof order === "object") {
		if (order.keys === undefined) {
			throw new InsightError("No keys in order");
		}
		if (order.dir !== "UP" && order.dir !== "DOWN") {
			throw new InsightError("ORDER direction must be 'UP' or 'DOWN'");
		}
		const keys = order.keys;
		keys.forEach((key: string) => {
			if (!columns.includes(key) && !applyKeys.has(key)) {
				throw new InsightError("All ORDER keys must be part of COLUMNS or apply keys");
			}
			if (key.includes("_") && key.split("_")[0] !== datasetID) {
				throw new InsightError("ORDER keys must reference the same dataset as COLUMNS");
			}
		});
	}
}
