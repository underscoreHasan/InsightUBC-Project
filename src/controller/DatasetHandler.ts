import JSZip from "jszip";
import Dataset from "./Dataset";
import Section from "./Section";
import Room from "./Room";
import {InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {parse} from "parse5";
import { Document, Element } from "parse5/dist/tree-adapters/default";


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
			// const validRooms = await this.extractRooms(zip);
			// if (validRooms.length === 0) {
			// 	throw new InsightError("no valid rooms");
			// }
			// this.addRoomsDatasetToMemory(id, validRooms);
			await this.extractRooms(zip);
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
	// private async extractRooms(zip: JSZip): Promise<Room[]> {
	private async extractRooms(zip: JSZip): Promise<void> {
		//TODO: finish implementation
		//find index.htm
		//call a method to read the table in index.htm: returns array of the filepaths needed or throws an error if something wrong with index.htm
		//pass array to another method to read each file amnd extract room info from that table
		//validate room info
		let indexContent;
		if (zip.files["index.htm"] && !zip.files["index.htm"].dir) {
			try {
				indexContent = await zip.files["index.htm"].async("text");
			} catch {
				throw new InsightError("Error reading file index.htm");
			}
		} else {
			throw new InsightError("index.htm not found");
		}
		const buildings = await this.extractBuildingsFromIndex(indexContent);

		for (const b of buildings) {
			console.log(b);
		}
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

	private async extractBuildingsFromIndex(indexContent: string): Promise<string[]> {
		// parse the html
		// find all the tables
		// find the building table (can be identified if any one <td> element with classes 'views-field' and 'views-field-field-building-address' is found)
		// traverse the building table and along the way extract the value in the address column for every building's row in the table
		// return a string array of all the addresses
		let parsedHTML;
		try {
			parsedHTML = parse(indexContent);
		} catch {
			throw new InsightError("Error parsing HTML content");
		}
		const allTables = this.findAllTables(parsedHTML);
		const buildingTable = this.findBuildingTable(allTables);
		return this.extractBuildingFilePaths(buildingTable);
	}

	private findAllTables(parsedHTML: Document): Document[] {
		const tables: Document[] = [];

		function recursiveSearch(node: Document) : void {
			if (node.nodeName.toString() === 'table') {
				tables.push(node);
			}

			if ('childNodes' in node) {
				for (const child of node.childNodes) {
					recursiveSearch(child as any as Document);
				}
			}
		}

		recursiveSearch(parsedHTML);
		return tables;
	}

	private findBuildingTable(allTables: any[]): any | null {
		for (const table of allTables) {
			if (this.containsViewsTableClass(table)) {
				return table;
			}
		}
		return null;
	}

	private containsViewsTableClass(node: Element): boolean {
		if (node.tagName === 'td' && node.attrs?.some(attr => attr.name === 'class' && attr.value.includes('views-field'))) {
			return true;
		}

		if (node.childNodes) {
			for (const child of node.childNodes) {
				if (this.containsViewsTableClass(child as Element)) {
					return true;
				}
			}
		}
		return false;
	}

	private extractBuildingFilePaths(buildingTable: Document): string[] {
		const filePaths: string[] = [];

		// Helper function to traverse the DOM
		const traverseAndExtract = (node: any): void => {
			// Check if node is a 'td' element with classes 'views-field' and 'views-field-title'
			if (node.tagName === 'td' && node.attrs?.some((attr: { value: string | string[]; }) => attr.value.includes('views-field-title'))) {
				// Find the 'a' child element
				const anchor = node.childNodes?.find((child: { nodeName: string; }) => child.nodeName === 'a') as Element;

				if (anchor) {
					const hrefAttr = anchor.attrs?.find(attr => attr.name === 'href');
					if (hrefAttr) {
						filePaths.push(hrefAttr.value);
					}
				}
			}

			if (node.childNodes) {
				for (const child of node.childNodes) {
					traverseAndExtract(child);
				}
			}
		};

		if (buildingTable.childNodes) {
			for (const child of buildingTable.childNodes) {
				traverseAndExtract(child);
			}
		}

		return filePaths;
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

	private extractValidRooms(parsedHTML: any): Room[] {
		//TODO: finish implementation
		if (parsedHTML && Array.isArray(parsedHTML.result)) {
			return parsedHTML.result
				.map((room: any) => this.createRoomFromJson(room))
				.filter((room: Room | null) => room !== null) as Room[];
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

	private createRoomFromJson(room: any): Room | null {
		if (
			"fullname" in room &&
			"shortname" in room &&
			"number" in room &&
			"name" in room &&
			"address" in room &&
			"lat" in room &&
			"lon" in room &&
			"seats" in room &&
			"type" in room &&
			"furniture" in room &&
			"href" in room
		) {
			return new Room(
				room.fullname,
				room.shortname,
				room.number,
				room.name,
				room.address,
				room.lat,
				room.lon,
				room.seats,
				room.type,
				room.furniture,
				room.href
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
