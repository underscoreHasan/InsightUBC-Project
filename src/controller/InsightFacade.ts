import { IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult } from "./IInsightFacade";
import JSZip from "jszip";
import Dataset from "./Dataset";
import Section from "./Section";

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

			// Process files inside "courses" folder
			const sectionPromises = Object.keys(zip.files)
				.filter((fileName) => fileName.startsWith("courses/") && !zip.files[fileName].dir)
				.map(async (fileName) => {
					const file = zip.files[fileName];
					try {
						const fileContent = await file.async("text");
						const parsedJSON = JSON.parse(fileContent);

						if (parsedJSON && Array.isArray(parsedJSON.result)) {
							// Return an array of valid Section objects from the result
							return parsedJSON.result
								.map((section: any) => {
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
										// Return the valid Section object
										return new Section(
											section.id,
											section.Course,
											section.Title,
											section.Professor,
											section.Subject,
											section.Year,
											section.Avg,
											section.Pass,
											section.Fail,
											section.Audit
										);
									}
									return null; // Return null for invalid sections
								})
								.filter((section: any) => section !== null); // Filter out nulls
						}
						return [];
					} catch {
						throw new InsightError(`Error processing file ${fileName}`);
					}
				});

			// Wait for all promises to resolve and flatten the resulting arrays of sections
			const validSections = (await Promise.all(sectionPromises)).flat();

			if (validSections.length !== 0) {
				// If there are valid sections, create a new Dataset and add sections to it
				const currentDataset = new Dataset(id);
				for (const section of validSections) {
					currentDataset.addSection(section);
				}
				this.datasetIDs.push(id); // Add the dataset id to the list of dataset IDs
				this.datasets.push(currentDataset); // Store the dataset
			} else {
				throw new InsightError("no valid sections");
			}
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
