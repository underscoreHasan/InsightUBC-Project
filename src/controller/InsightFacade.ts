import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";
import JSZip from "jszip";
import Dataset from "./Dataset";
import Section from "./Section";
import fs from "fs-extra";
import path from "path";

const DATA_DIR = path.join(__dirname, "data");

export default class InsightFacade implements IInsightFacade {
	private datasetIDs: string[] = [];
	private datasets: Dataset[] = [];

	public async addDataset(id: string, content: string, _kind: InsightDatasetKind): Promise<string[]> {
		if (!this.validId(id)) {
			throw new InsightError("id was invalid!");
		}

		let zip: JSZip;
		try {
			zip = await this.loadZip(content);
		} catch (err) {
			this.handleZipError(err);
		}

		// Process and validate sections
		const validSections = await this.extractSections(zip);
		if (validSections.length === 0) {
			throw new InsightError("no valid sections");
		}

		// Add dataset and valid sections
		const currentDataset = this.addDatasetToMemory(id, validSections);
		try {
			await this.saveDatasetToDisk(currentDataset, id);
		} catch {
			// Log the error and re-throw to inform the caller
			throw new InsightError("Failed to save dataset to disk.");
		}
		return this.datasetIDs;
	}

	// Helper method to validate id
	private validId(id: string): boolean {
		const regex = new RegExp("^[^_]+$");
		return regex.test(id) && id.trim().length !== 0 && !this.datasetIDs.includes(id);
	}

	// Helper method to load JSZip content
	private async loadZip(content: string): Promise<JSZip> {
		try {
			return await JSZip.loadAsync(content, { base64: true });
		} catch (err) {
			if (err instanceof Error) {
				throw new InsightError("JSZip threw error: " + err.message);
			} else {
				throw new InsightError("An unknown error occurred.");
			}
		}
	}

	// Helper method to handle JSZip error
	private handleZipError(err: any): never {
		if (err instanceof Error) {
			throw new InsightError("JSZip threw error: " + err.message);
		} else {
			throw new InsightError("An unknown error occurred.");
		}
	}

	// Extract sections from zip file
	private async extractSections(zip: JSZip): Promise<Section[]> {
		const fileNames = Object.keys(zip.files).filter(
			(fileName) => fileName.startsWith("courses/") && !zip.files[fileName].dir
		);

		const sectionPromises = fileNames.map(async (fileName) => this.processFile(zip, fileName));
		const sectionResults = await Promise.all(sectionPromises);
		return sectionResults.flat();
	}

	// Process individual file and return valid sections
	private async processFile(zip: JSZip, fileName: string): Promise<Section[]> {
		const file = zip.files[fileName];

		try {
			const fileContent = await file.async("text");
			const parsedJSON = JSON.parse(fileContent);
			return this.extractValidSections(parsedJSON);
		} catch {
			throw new InsightError(`Error processing file ${fileName}`);
		}
	}

	// Extract valid sections from parsed JSON
	private extractValidSections(parsedJSON: any): Section[] {
		if (parsedJSON && Array.isArray(parsedJSON.result)) {
			return parsedJSON.result
				.map((section: any) => this.createSectionFromJson(section))
				.filter((section: Section | null) => section !== null) as Section[];
		}
		return [];
	}

	// Create Section object from JSON section if it's valid
	private createSectionFromJson(section: any): Section | null {
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
		return null;
	}

	// Add dataset to memory
	private addDatasetToMemory(id: string, sections: Section[]): Dataset {
		const currentDataset = new Dataset(id);
		for (const section of sections) {
			currentDataset.addSection(section);
		}
		this.datasetIDs.push(id);
		this.datasets.push(currentDataset);
		return currentDataset;
	}

	private async saveDatasetToDisk(dataset: Dataset, id: string): Promise<void> {
		const dirPath = DATA_DIR; // Use the directory path defined earlier
		const filePath = path.join(dirPath, `${id}.json`);

		// Check if the data directory exists; if not, create it
		await fs.ensureDir(dirPath); // This will create the directory if it does not exist
		const dataToSave = {
			datasetID: dataset.getDatasetID(),
			sections: dataset.getSections().map((section) => ({
				uuid: section.getUuid(),
				id: section.getId(),
				title: section.getTitle(),
				instructor: section.getInstructor(),
				dept: section.getDept(),
				year: section.getYear(),
				avg: section.getAvg(),
				pass: section.getPass(),
				fail: section.getFail(),
				audit: section.getAudit(),
			})), // Ensure only serializable properties are included
		};
		await fs.writeJson(filePath, dataToSave);
	}

	public async removeDataset(id: string): Promise<string> {
		const regex = new RegExp("^[^_]+$");
		if (!(regex.test(id) && id.trim().length !== 0)) {
			throw new InsightError("Invalid ID provided for removal");
		}

		const index = this.datasetIDs.indexOf(id);
		if (index === -1) {
			throw new NotFoundError("Dataset not found!");
		}

		// Remove from memory
		this.datasetIDs.splice(index, 1);
		this.datasets.splice(index, 1);

		// Remove from disk
		// const filePath = path.join(DATA_DIR, `${id}.json`);
		// await fs.remove(filePath);

		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		throw new Error(`InsightFacadeImpl::performQuery() is unimplemented! - query=${query};`);
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		return this.datasets.map((dataset) => ({
			id: dataset.getDatasetID(),
			kind: InsightDatasetKind.Sections,
			numRows: dataset.getSections().length,
		}));
	}
}
