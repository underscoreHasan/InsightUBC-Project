import JSZip from "jszip";
import Dataset from "./Dataset";
import Section from "./Section";
import {InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";

export class DatasetHandler {
	private datasetIDs: string[] = [];
	private datasets: Dataset[] = [];

	public getDatasetIDs(): string[] {
		return this.datasetIDs;
	}

	public getDatasets(): Dataset[] {
		return this.datasets;
	}

	public validId(id: string): boolean {
		const regex = new RegExp("^[^_]+$");
		const rgx = regex.test(id);
		const trim = id.trim().length !== 0
		const includes = !this.datasetIDs.includes(id);
		return rgx && trim && includes;
		//return regex.test(id) && id.trim().length !== 0 && !this.datasetIDs.includes(id);
	}

	public async loadZip(content: string): Promise<JSZip> {
		try {
			return await JSZip.loadAsync(content, { base64: true });
		} catch (err) {
			throw new InsightError("JSZip threw error: " + (err instanceof Error ? err.message : "An unknown error occurred."));
		}
	}

	public async processZip(id: string, zip: JSZip, kind: InsightDatasetKind): Promise<void> {
		if (kind === InsightDatasetKind.Sections) {
			const validSections = await this.extractSections(zip);
			if (validSections.length === 0) {
				throw new InsightError("no valid sections");
			}
			this.addSectionsDatasetToMemory(id, validSections);
		} else if (kind === InsightDatasetKind.Rooms) {
			const validRooms = await this.extractRooms(zip);
			if (validRooms.length === 0) {
				throw new InsightError("no valid rooms");
			}
			this.addRoomsDatasetToMemory(id, validRooms);
		} else {
			throw new InsightError("Invalid kind!");
		}

	}

	public getDataset(id: string): Dataset {
		const index = this.datasetIDs.indexOf(id);
		return this.datasets[index];
	}

	// Extract sections from zip file
	private async extractSections(zip: JSZip): Promise<Section[]> {
		const fileNames = Object.keys(zip.files).filter(
			(fileName) => fileName.startsWith("courses/") && !zip.files[fileName].dir
		);
		const sectionPromises = fileNames.map(async (fileName) => this.processSectionsFile(zip, fileName));
		const sectionResults = await Promise.all(sectionPromises);
		return sectionResults.flat();
	}

	// Extract rooms from zip file
	private async extractRooms(zip: JSZip): Promise<Room[]> {
		//TODO: finish implementation
		const fileNames = Object.keys(zip.files).filter(
			(fileName) => fileName.startsWith("courses/") && !zip.files[fileName].dir
		);
		const sectionPromises = fileNames.map(async (fileName) => this.processSectionsFile(zip, fileName));
		const sectionResults = await Promise.all(sectionPromises);
		return sectionResults.flat();
	}

	private async processSectionsFile(zip: JSZip, fileName: string): Promise<Section[]> {
		const file = zip.files[fileName];
		try {
			const fileContent = await file.async("text");
			const parsedJSON = JSON.parse(fileContent);
			return this.extractValidSections(parsedJSON);
		} catch {
			throw new InsightError(`Error processing file ${fileName}`);
		}
	}

	private async processRoomsFile(zip: JSZip, fileName: string): Promise<Room[]> {
		//TODO: finish implementation
		const file = zip.files[fileName];
		try {
			const fileContent = await file.async("text");
			const parsedJSON = JSON.parse(fileContent);
			return this.extractValidRooms(parsedJSON);
		} catch {
			throw new InsightError(`Error processing file ${fileName}`);
		}
	}

	private extractValidSections(parsedJSON: any): Section[] {
		if (parsedJSON && Array.isArray(parsedJSON.result)) {
			return parsedJSON.result
				.map((section: any) => this.createSectionFromJson(section))
				.filter((section: Section | null) => section !== null) as Section[];
		}
		return [];
	}

	private extractValidRooms(parsedJSON: any): Room[] {
		//TODO: finish implementation
		if (parsedJSON && Array.isArray(parsedJSON.result)) {
			return parsedJSON.result
				.map((section: any) => this.createSectionFromJson(section))
				.filter((section: Section | null) => section !== null) as Section[];
		}
		return [];
	}

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
			const overallSectionReplacementYear = 1900;
			const year = section.Section === "overall" ? overallSectionReplacementYear : section.Year;
			return new Section(
				section.id,
				section.Course,
				section.Title,
				section.Professor,
				section.Subject,
				year,
				section.Avg,
				section.Pass,
				section.Fail,
				section.Audit
			);
		}
		return null;
	}

	private createRoomFromJson(section: any): Section | null {
		//TODO: Complete implementation
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
			const overallSectionReplacementYear = 1900;
			const year = section.Section === "overall" ? overallSectionReplacementYear : section.Year;
			return new Section(
				section.id,
				section.Course,
				section.Title,
				section.Professor,
				section.Subject,
				year,
				section.Avg,
				section.Pass,
				section.Fail,
				section.Audit
			);
		}
		return null;
	}

	private addSectionsDatasetToMemory(id: string, sections: Section[]): Dataset {
		const currentDataset = new Dataset(id);
		for (const section of sections) {
			currentDataset.addSection(section);
		}
		this.datasetIDs.push(id);
		this.datasets.push(currentDataset);
		return currentDataset;
	}

	private addRoomsDatasetToMemory(id: string, rooms: Room[]): Dataset {
		//TODO: Complete Implementation
		const currentDataset = new Dataset(id);
		for (const room of rooms) {
			currentDataset.addRoom(room);
		}
		this.datasetIDs.push(id);
		this.datasets.push(currentDataset);
		return currentDataset;
	}

	public removeDatasetFromMemory(id: string): void {
		const index = this.datasetIDs.indexOf(id);
		if (index !== -1) {
			this.datasetIDs.splice(index, 1);
			this.datasets.splice(index, 1);
		} else {
			throw new NotFoundError("Dataset not found!");
		}
	}
}
