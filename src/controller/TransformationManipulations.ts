import { ValidFields } from "./ASTTree";
import { InsightError } from "./IInsightFacade";
import Decimal from "decimal.js";

export const validApplyToken = new Set(["MAX", "MIN", "AVG", "COUNT", "SUM"]);

export const numericFields = new Set(["year", "avg", "pass", "fail", "audit", "lat", "lon", "seats"]);
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
		if (order.keys.length === 0) {
			throw new InsightError("Empty keys");
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
	const results = applyToGroups(groupedResults, query);
	return results;
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
		if (!columns.includes(key)) {
			throw new InsightError("Key not in columns");
		}
		requestedKeys.add(key);
	});
	validateApply(apply, datasetID, requestedKeys, columns);
	columns.forEach((key: string) => {
		if (!requestedKeys.has(key)) {
			throw new InsightError("Key not in columns");
		}
	});
}

function validateApply(apply: any, datasetID: string, requestedKeys: Set<string>, columns: any): void {
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
		if (typeof applyQuery !== "string") {
			throw new InsightError("Wrong type in apply");
		}
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
		if (!columns.includes(key)) {
			throw new InsightError("Key not in columns");
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

function applyToGroups(groupedData: Map<string, any[]>, query: any): any[] {
	const results: any[] = [];
	const applyRules = query.TRANSFORMATIONS.APPLY;
	const columns = query.OPTIONS.COLUMNS;
	const groupFields = query.TRANSFORMATIONS.GROUP;

	for (const [groupKey, entries] of groupedData.entries()) {
		const aggregatedResult: any = applyAggregation(entries, applyRules);
		populateGroupFields(aggregatedResult, groupKey, groupFields);
		const finalResult = constructFinalResult(aggregatedResult, columns);
		results.push(finalResult);
	}
	return results;
}

function applyAggregation(entries: any[], applyRules: any[]): any {
	const aggregatedResult: any = {};
	applyRules.forEach((applyRule: any) => {
		const applyKey = Object.keys(applyRule)[0];
		const [token, field] = Object.entries(applyRule[applyKey])[0] as [any, any];
		aggregatedResult[applyKey] = calculateAggregation(token, field.split("_")[1], entries);
	});
	return aggregatedResult;
}

function calculateAggregation(token: string, field: string, entries: any[]): any {
	const two = 2;
	switch (token) {
		case "MAX":
			return Math.max(...entries.map((entry: any) => entry[field]));
		case "MIN":
			return Math.min(...entries.map((entry: any) => entry[field]));
		case "AVG": {
			let total = new Decimal(0);

			entries.forEach((entry: any) => (total = total.add(new Decimal(entry[field]))));

			return Number((total.toNumber() / entries.length).toFixed(two));
		}
		case "SUM": {
			let total = new Decimal(0);
			entries.forEach((entry: any) => (total = total.add(new Decimal(entry[field]))));
			return Number(total.toFixed(two));
		}
		case "COUNT": {
			const uniqueValues = new Set(entries.map((entry: any) => entry[field]));
			return uniqueValues.size;
		}
		default:
			throw new Error(`Unknown apply token: ${token}`);
	}
}

function populateGroupFields(aggregatedResult: any, groupKey: string, groupFields: any[]): void {
	const groupKeyFields = groupKey.split("_");
	groupFields.forEach((groupField: string, index: number) => {
		const originalField = groupField.split("_")[1];
		aggregatedResult[originalField] = groupKeyFields[index];
	});
}

function constructFinalResult(aggregatedResult: any, columns: string[]): any {
	return columns.reduce((acc: any, column: string) => {
		const field = column.includes("_") ? column.split("_")[1] : column;
		if (numericFields.has(field)) {
			const value = Number(aggregatedResult[field]);
			acc[field] = value;
		} else {
			acc[field] = aggregatedResult[field];
		}
		return acc;
	}, {});
}

export function sortResults(results: any[], keys: string[], dir: "UP" | "DOWN" = "UP"): any[] {
	const direction = dir === "DOWN" ? -1 : 1;

	// Process keys to ignore prefixes if present, for example "sections_avg" -> "avg"
	const splitSortKeys = keys.map((key) => (key.includes("_") ? key.split("_")[1] : key));
	if (!splitSortKeys) {
		throw new InsightError("Weird behavior...");
	}
	return results.sort((a, b) => {
		for (const key of splitSortKeys) {
			if (a[key] < b[key]) {
				return -1 * direction;
			}
			if (a[key] > b[key]) {
				return 1 * direction;
			}
		}
		return 0;
	});
}

export function validateNoRooms(options: any): string {
	//iterate through column and validate
	const columns = options.COLUMNS;
	let prevDatasetID = columns[0].split("_");

	columns.forEach((field: any) => {
		const splitField = field.split("_");
		const curDatasetID = splitField[0];
		const curField = splitField[1];
		if (!curDatasetID === prevDatasetID || !ValidFields.has(curField)) {
			console.log(curDatasetID,prevDatasetID,curField)
			throw new InsightError("Error with columns");
		}
		prevDatasetID = curDatasetID;
	});

	//validate order
	const order = options.ORDER;
	if (typeof order === "string") {
		if (!columns.includes(order)) {
			throw new InsightError("ORDER key must be part of COLUMNS or an apply key");
		}
	} else if (typeof order === "object") {
		if (order.keys === undefined) {
			throw new InsightError("No keys in order");
		}
		if (order.dir !== "UP" && order.dir !== "DOWN") {
			throw new InsightError("ORDER direction must be 'UP' or 'DOWN'");
		}
	}
	return prevDatasetID;
}
