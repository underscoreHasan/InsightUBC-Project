import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import { ASTTree } from "./ASTTree";
import fs from "fs-extra";
import path from "path";
import { saveDatasetToDisk, addCacheToMemory } from "./DiskHandler";
import {
	applyValidation,
	sortResults,
	transformResults,
	validateNoRooms,
	validateRooms,
} from "./TransformationManipulations";
import { DatasetHandler } from "./DatasetHandler";
export const DATA_DIR = path.join(__dirname, "../../data");
export default class InsightFacade implements IInsightFacade {
	private datasetHandler = new DatasetHandler();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		await addCacheToMemory(this.datasetHandler.getDatasets(), this.datasetHandler.getDatasetIDs());
		if (!this.datasetHandler.validId(id)) {
			throw new InsightError("id was invalid!");
		}
		try {
			const zip = await this.datasetHandler.loadZip(content);
			await this.datasetHandler.processZip(id, zip, kind);
			await saveDatasetToDisk(this.datasetHandler.getDataset(id), id, kind);
		} catch (err) {
			if (err instanceof Error) {
				// highest level error catch block
				throw new InsightError("Failed to process dataset: " + err.message);
			} else {
				throw new InsightError("An unknown error occurred.");
			}
		}
		return this.datasetHandler.getDatasetIDs();
	}

	public async removeDataset(id: string): Promise<string> {
		await addCacheToMemory(this.datasetHandler.getDatasets(), this.datasetHandler.getDatasetIDs());
		const regex = new RegExp("^[^_]+$");
		if (!(regex.test(id) && id.trim().length !== 0)) {
			throw new InsightError("Invalid ID provided for removal");
		}
		try {
			this.datasetHandler.removeDatasetFromMemory(id);
			await fs.ensureDir(DATA_DIR);
			const filePath = path.join(DATA_DIR, `${id}.json`);
			await fs.remove(filePath);
		} catch (err) {
			if (err instanceof NotFoundError) {
				throw err;
			} else if (err instanceof Error) {
				throw new InsightError("Failed to remove dataset: " + err.message);
			} else {
				throw new InsightError("An unknown error occurred.");
			}
		}
		return id;
	}

	public async performQuery(query: any): Promise<InsightResult[]> {
		const curDatasetID: string = this.validateAndPrepareQuery(query);
		const sections = this.getData(curDatasetID);
		const filteredResults = this.filterResults(query.WHERE, sections, curDatasetID);
		const finalResults = this.transformAndSortResults(filteredResults, query, curDatasetID);

		return finalResults as InsightResult[];
	}

	private validateAndPrepareQuery(query: any): string {
		this.validateQueryWhere(query.WHERE);
		const curDatasetID: string = this.validateColumnsAndOptions(query);
		if (query.TRANSFORMATIONS) {
			applyValidation(query, curDatasetID);
		}
		if (!this.datasetHandler.getDatasetIDs().includes(curDatasetID)) {
			throw new InsightError("Dataset not in added lists");
		}
		return curDatasetID;
	}

	private filterResults(queryParams: any, sections: any[], curDatasetID: string): any[] {
		if (Object.entries(queryParams).length === 0) {
			return sections; // Return all if no filters are applied
		}
		const createdASTTree = new ASTTree(queryParams, curDatasetID);
		return sections.filter((section: any) => {
			return createdASTTree.evaluate(section);
		});
	}

	private transformAndSortResults(filteredResults: any[], query: any, curDatasetID: string): any[] {
		const columnFiltered = filteredResults.map((section: any) => {
			const result: any = {};
			const columns = this.extractFilterColumns(query);
			columns.forEach((column) => {
				result[column] = section[column];
			});
			return result;
		});
		let transformedResults = columnFiltered;
		if (query.TRANSFORMATIONS) {
			transformedResults = transformResults(transformedResults, query);
		}
		let sortedResult = transformedResults;
		if (query.OPTIONS.ORDER) {
			const order = query.OPTIONS.ORDER;
			if (typeof order === "string") {
				// Single-column sorting, defaults to ascending ("UP") order
				sortedResult = sortResults(transformedResults, [order], "UP");
			} else if (typeof order === "object" && Array.isArray(order.keys)) {
				// Multi-column sorting with specified direction ("UP" or "DOWN")
				const { keys, dir } = order;
				sortedResult = sortResults(transformedResults, keys, dir || "UP");
			} else {
				throw new InsightError("Invalid ORDER format in OPTIONS");
			}
		}
		return this.constructFinalResult(sortedResult, curDatasetID, query);
	}

	//this function creates the results into the insightresult type
	private constructFinalResult(sortedResult: any[], curDatasetID: string, query: any): any {
		const result: any[] = [];
		const maxNum = 5000;
		const columns = query.OPTIONS.COLUMNS;
		sortedResult.forEach((entry) => {
			const newEntry: Record<string, any> = {};
			for (const [key, value] of Object.entries(entry)) {
				if (!columns.includes(key)) {
					newEntry[`${curDatasetID}_${key}`] = value;
				} else {
					newEntry[key] = value;
				}
			}
			result.push(newEntry as InsightResult);
		});
		if (result.length >= maxNum) {
			throw new ResultTooLargeError("Too many results");
		}
		return result;
	}

	// this function takes the OPTIONS.COLUMNS part and strips all the dataset id's from the front
	private extractFilterColumns(query: any): string[] {
		const columns = query.OPTIONS.COLUMNS;
		const result: string[] = [];
		columns.forEach((column: string) => {
			if (column.includes("_")) {
				result.push(column.split("_")[1]);
			}
		});
		if (query.TRANSFORMATIONS !== undefined) {
			const apply = query.TRANSFORMATIONS.APPLY;

			if (apply.length >= 1) {
				apply.forEach((entry: any) => {
					const column = Object.entries(entry)[0][1] as any;
					const field = Object.entries(column)[0][1] as string;

					result.push(field.split("_")[1]);
				});
			}
		}

		return result;
	}

	// Helper method to load a dataset from disk and store it in memory

	private validateQueryWhere(queryParams: any): void {
		if (queryParams === undefined || queryParams === null) {
			throw new InsightError("Must include WHERE clause");
		}
		if (Object.keys(queryParams).length > 1) {
			throw new InsightError("Multiple keys error");
		}
	}
	// this function takes in the query and checks the options, columns and order section
	// params: queryOptions: any because it can either be empty or a json file
	// returns the latest dataset referenced, or InsightError if breaks spec
	private validateColumnsAndOptions(queryOptions: any): string {
		//check if empty
		if (queryOptions === undefined || queryOptions === null) {
			throw new InsightError("Query is empty!");
		}

		if (queryOptions.OPTIONS === undefined) {
			throw new InsightError("Options is empty!");
		}
		//vaidate options
		const options = queryOptions.OPTIONS;
		if (options.COLUMNS.length === 0) {
			throw new InsightError("Columns is empty!");
		}
		if (queryOptions.TRANSFORMATIONS !== undefined) {
			return validateRooms(options);
		} else {
			return validateNoRooms(options);
		}
	}
	private getData(datasetID: string): any[] {
		let results: any[] = [];
		this.datasetHandler.getDatasets().forEach((dataset: any) => {
			if (dataset.getDatasetID() === datasetID) {
				if (dataset.getKind() === "sections") {
					results = dataset.getSections();
				} else {
					results = dataset.getRooms();
				}
			}
		});
		return results;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await addCacheToMemory(this.datasetHandler.getDatasets(), this.datasetHandler.getDatasetIDs());
		return this.datasetHandler.getDatasets().map((dataset) => ({
			id: dataset.getDatasetID(),
			kind: dataset.getKind(),
			numRows: dataset.getKind() === "sections" ? dataset.getSections().length : dataset.getRooms().length,
		}));
	}
}
