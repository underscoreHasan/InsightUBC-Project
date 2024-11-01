import { create } from "domain";
import { ValidFields } from "./ASTTree";
import { InsightError } from "./IInsightFacade";

export const validApplyToken = new Set(["MAX", "MIN", "AVG", "COUNT", "SUM"]);

const numericFields = new Set(["year", "avg", "pass", "fail", "audit", "lat", "lon", "seats"]);
export function validateRooms(options: any): string {
	//iterate through column and validate
	const columns = options.COLUMNS;
	const order = options.ORDER;
	const applyKeys = new Set<string>();
	let datasetID: string | null = null;

	// validate columns, make sure only one dataset but can have applykeys so add those
	columns.forEach((column: any) => {
		if (column.includes("_")) {
			const [curDataset] = column.split("_");
			if (datasetID && datasetID !== curDataset) {
				throw new InsightError("Multiple datasets in columns");
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
export function applyValidation(query: any, datasetId: string): any {
	validateTransformations(query.OPTIONS, query.TRANSFORMATIONS, datasetId);
}

export function transformResults(data: any, query: any): any {
	const groups = query.TRANSFORMATIONS.GROUP.map((entry: any) => {
		return entry.split("_")[1];
	});
	const groupedResults = createGroupings(data, groups);
	applyToGroups(groupedResults, query.TRANSFORMATIONS.APPLY);
	return [];
}

function validateTransformations(options: any, transformations: any, datasetID: string): void {
	const columns = options.COLUMNS;
	const group = transformations.GROUP;
	const apply = transformations.APPLY;
	if (group === undefined) {
		throw new InsightError("Missing group in transformation");
	}
	if (apply === undefined) {
		throw new InsightError("Missing apply in transformation");
	}

	const requestedKeys = new Set<string>();
	// parse through transformations and get all the keys
	group.forEach((key: string) => {
		requestedKeys.add(key);
	});
	validateApply(apply, datasetID, requestedKeys);
	columns.forEach((key: string) => {
		if (!requestedKeys.has(key)) {
			throw new InsightError("Key not in columns");
		}
	});
}

function validateApply(apply: any, datasetID: string, requestedKeys: Set<string>): void {
	const applyKeys: any[] = [];
	apply.forEach((obj: any) => {
		if (Object.keys(obj).length > 1) {
			throw new InsightError("Too many keys in one apply rule");
		}
		const key = Object.keys(obj)[0];
		if (applyKeys.includes(key)) {
			throw new InsightError("Duplicate apply keys");
		}
		applyKeys.push(key);
		const applyRule: any = Object.entries(obj)[0][1];
		if (!validApplyToken.has(Object.keys(applyRule)[0])) {
			throw new InsightError("Not valid apply token");
		}

		const applyQuery: string = Object.entries(applyRule)[0][1] as string;
		const [curDataset, field] = applyQuery.split("_");
		if (curDataset !== datasetID) {
			throw new InsightError("Multiple datasets in apply field");
		}
		if (!ValidFields.has(field)) {
			throw new InsightError("Field is invalid");
		}
		if (Object.keys(applyRule)[0] !== "COUNT" && !numericFields.has(field)) {
			throw new InsightError("Wrong type for token in apply");
		}
		requestedKeys.add(key);
	});
}

function createGroupings(data: any, groups: any): Map<string, any[]> {
	const groupings = new Map<string, any[]>();
	data.forEach((entry: any) => {
		let entryKey = "";
		groups.forEach((group: any) => {
			entryKey += `${entry[group]}_`;
		});
		entryKey = entryKey.substring(0, entryKey.length - 1);
		if (!groupings.has(entryKey)) {
			groupings.set(entryKey, []);
		}
		groupings.get(entryKey)?.push(entry);
	});

	return groupings;
}

function applyToGroups(data: any, applyRules: any): any[] {
	console.log(data);
	data.forEach((group: any) => {
		// console.log(group);
	});
	return [];
}
