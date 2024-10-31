import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult, NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import { ASTTree, ValidFields } from "./ASTTree";
import fs from "fs-extra";
import path from "path";
import { saveDatasetToDisk, loadDatasetFromDisk, addCacheToMemory } from "./DiskHandler";
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
			await saveDatasetToDisk(this.datasetHandler.getDataset(id), id);
		} catch (err) {
			//TODO: make sure the correct error TYPES are thrown
			if (err instanceof Error) {
			// Log the error and re-throw it to inform the caller
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
		this.validateQueryWhere(query.WHERE);
		// validate columns and options
		const curDatasetID: string = this.validateColumnsAndOptions(query);

		if (!this.datasetHandler.getDatasetIDs().includes(curDatasetID)) {
			throw new InsightError("Dataset not in added lists");
		}

		//create AST tree
		const queryParams = query.WHERE;
		let filteredResults;
		const sections = await loadDatasetFromDisk(curDatasetID);

		if (Object.entries(queryParams).length !== 0) {
			const createdASTTree = new ASTTree(queryParams, curDatasetID);
			// createdASTTree.printTree();
			//apply search on section
			filteredResults = sections.filter((section: any) => {
				return createdASTTree.evaluate(section);
			});
		} else {
			filteredResults = sections;
		}
		//return results based on columns and options
		const columnFiltered = filteredResults.map((section: any) => {
			const result: any = [];
			const columns = this.extractFilterColumns(query.OPTIONS.COLUMNS);
			columns.forEach((column) => {
				result[column] = section[column];
			});
			return result;
		});
		let sortedResult = columnFiltered;
		if (query.OPTIONS.ORDER) {
			sortedResult = this.sortResults(columnFiltered, query.OPTIONS.ORDER.split("_")[1]);
		}
		const result = this.constructFinalResult(sortedResult, curDatasetID);

		return result as InsightResult[];
	}

	//this function creates the results into the insightresult type
	private constructFinalResult(sortedResult: any[], curDatasetID: string): any {
		const result: any[] = [];

		sortedResult.forEach((entry) => {
			const newEntry: Record<string, any> = {};

			for (const [key, value] of Object.entries(entry)) {
				newEntry[`${curDatasetID}_${key}`] = value;
			}

			result.push(newEntry as InsightResult);
		});
		const maxNum = 5000;

		if (result.length >= maxNum) {
			throw new ResultTooLargeError("Too many results");
		}
		return result;
	}

	private sortResults(array: any[], primaryField: string): any[] {
		return [...array].sort((a: any, b: any) => {
			if (a[primaryField] < b[primaryField]) {
				return -1;
			}
			if (a[primaryField] > b[primaryField]) {
				return 1;
			}

			const fields = Object.keys(a).filter((field) => field !== primaryField);

			for (const field of fields) {
				if (a[field] < b[field]) {
					return -1;
				}
				if (a[field] > b[field]) {
					return 1;
				}
			}

			return 0;
		});
	}
	// this function takes the OPTIONS.COLUMNS part and strips all the dataset id's from the front
	private extractFilterColumns(columns: any): string[] {
		const result: string[] = [];
		columns.forEach((column: string) => {
			result.push(column.split("_")[1]);
		});
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

		//iterate through column and validate
		const columns = options.COLUMNS;
		let prevDatasetID = columns[0].split("_");

		columns.forEach((field: any) => {
			const splitField = field.split("_");
			const curDatasetID = splitField[0];
			const curField = splitField[1];
			if (!curDatasetID === prevDatasetID || !ValidFields.has(curField)) {
				throw new InsightError("Error with columns");
			}
			prevDatasetID = curDatasetID;
		});

		//validate order
		const order = options.ORDER;
		if (order !== undefined) {
			if (!columns.includes(order)) {
				throw new InsightError("order has to be part of columns");
			}
			if (order.substring(0, order.indexOf("_")) !== prevDatasetID) {
				throw new InsightError("order is referencing an invalid dataset");
			}
		}
		return prevDatasetID;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await addCacheToMemory(this.datasetHandler.getDatasets(), this.datasetHandler.getDatasetIDs());
		return this.datasetHandler.getDatasets().map((dataset) => ({
			id: dataset.getDatasetID(),
			kind: InsightDatasetKind.Sections,
			numRows: dataset.getSections().length,
		}));
	}
}
