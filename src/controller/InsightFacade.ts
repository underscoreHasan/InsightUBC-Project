import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import JSZip from "jszip";
import Dataset from "./Dataset";
import Section from "./Section";
import { rejects } from "node:assert";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private datasetIDs: string[] = [];
	private datasets: Dataset[] = [];

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (this.validId(id)) {
			let zip: JSZip;
			// Validate that id is not a duplicate and is formatted correctly
			// Validate that content represents a valid ZIP file
			try {
				zip = await JSZip.loadAsync(content, { base64: true });
			} catch (err) {
				if (err instanceof Error) {
					throw new InsightError("JSZip threw error: " + err.message);
				} else {
					// Handle unexpected errors
					throw new InsightError("An unknown error occurred.");
				}
			}

			const filePromises = Object.keys(zip.files)
				.filter((fileName) => fileName.startsWith("courses/") && !zip.files[fileName].dir)
				.map(async (fileName) => {
					const file = zip.files[fileName];

					try {
						const fileContent = await file.async("text");
						const parsedJSON = JSON.parse(fileContent);

						if (parsedJSON && Array.isArray(parsedJSON.result)) {
							parsedJSON.result.forEach((section: any) => {
								if (
									"id" in section &&
									"Course" in section &&
									"Title" in section &&
									"Professor" in section &&
									"Subject" in section &&
									"Year" in section &&
									"Avg" in section &&
									"Pass" in section &&
									"Fail" in section &&
									"Audit" in section
								) {
									//only valid sections come through to here
								}
							});
						}
					} catch {
						console.log(`Error processing file ${fileName}`);
						throw new InsightError(`Error processing file ${fileName}`);
					}
				});

			//TODO: parse the json files inside the courses folder

			// this.datasetIDs.push(id);
			return this.datasetIDs;
		} else {
			throw new InsightError("id was invalid!");
		}
	}

	private validId(id: string): boolean {
		const regex = new RegExp("^[^_]+$");
		return regex.test(id) && id.trim().length !== 0 && !this.datasetIDs.includes(id);
	}

	public async removeDataset(id: string): Promise<string> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::removeDataset() is unimplemented! - id=${id};`);
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		// TODO: Remove this once you implement the methods!
		throw new Error(`InsightFacadeImpl::listDatasets is unimplemented!`);
	}
}
