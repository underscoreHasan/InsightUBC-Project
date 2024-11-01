import JSZip from "jszip";
import Dataset from "./Dataset";
import Section from "./Section";
import Room from "./Room";
import Building from "./Building";
import {InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import {parse} from "parse5";
import { Document, Element } from "parse5/dist/tree-adapters/default";


export class DatasetHandler {
	private datasetIDs: string[] = [];
	private datasets: Dataset[] = [];

	public getDataset(id: string): Dataset {
		const index = this.datasetIDs.indexOf(id);
		return this.datasets[index];
	}

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

	// sections stuff
	// Extract sections from zip file
	private async extractSections(zip: JSZip): Promise<Section[]> {
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

	private extractValidSections(parsedJSON: any): Section[] {
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

	private addSectionsDatasetToMemory(id: string, sections: Section[]): Dataset {
		const currentDataset = new Dataset(id);
		for (const section of sections) {
			currentDataset.addSection(section);
		}
		this.datasetIDs.push(id);
		this.datasets.push(currentDataset);
		return currentDataset;
	}

	// rooms stuff
	// Extract rooms from zip file
	private async extractBuildings(indexContent: string): Promise<Building[]> {
		// parse the html
		// find all the tables
		// find the building table (can be identified if any one <td> element with classes 'views-field' and 'views-field-field-building-address' is found)
		// traverse the building table and along the way extract the value of fullName, shortName, address, lat, lon, directory for every building's row in the table
		// return a string array of all the addresses
		let parsedHTML;
		try {
			parsedHTML = parse(indexContent);
		} catch {
			throw new InsightError("Error parsing HTML content");
		}
		const allTables = this.findAllTables(parsedHTML);
		const buildingTable = this.findMainTable(allTables);
		if (buildingTable === null) {
			throw new InsightError("No building table was found in index.htm")
		}
		return this.extractBuildingInfo(buildingTable);
	}

	private async extractRooms(zip: JSZip): Promise<Room[]> {
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

		if (!zip.folder("campus/discover/buildings-and-classrooms")) {
			throw new InsightError("Error accessing ./campus/discover/buildings-and-classrooms directory")
		}
		const buildings = await this.extractBuildings(indexContent);

		const roomResults = await this.processRoomsFile(zip, buildings);

		// for (const room of roomResults) {
		// 	console.log('Room Details:');
		// 	console.log(`  Full Name: ${room.getFullName()}`);
		// 	console.log(`  Short Name: ${room.getShortName()}`);
		// 	console.log(`  Number: ${room.getNumber()}`);
		// 	console.log(`  Name: ${room.getName()}`);
		// 	console.log(`  Address: ${room.getAddress()}`);
		// 	console.log(`  Latitude: ${room.getLat()}`);
		// 	console.log(`  Longitude: ${room.getLon()}`);
		// 	console.log(`  Seats: ${room.getSeats()}`);
		// 	console.log(`  Type: ${room.getType()}`);
		// 	console.log(`  Furniture: ${room.getFurniture()}`);
		// 	console.log(`  Href: ${room.getHref()}`);
		// }
		if (roomResults.flat.length === 0) {
			throw new InsightError("No valid rooms")
		} else {
			return roomResults.flat();
		}
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

	private findMainTable(allTables: any[]): any | null {
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

	private extractBuildingInfo(buildingTable: Document): Building[] {
		const buildings: Building[] = [];

		// Helper function to traverse the DOM
		const traverseAndExtract = (node: any, currentBuilding: any): any => {
			if (node.tagName === 'td') {
				const classAttr = node.attrs?.find((attr: { name: string }) => attr.name === 'class');
				if (classAttr) {
					if (classAttr.value.includes('views-field-title')) {
						const anchor = node.childNodes?.find((child: { nodeName: string }) => child.nodeName === 'a') as Element;
						if (anchor) {
							const hrefAttr = anchor.attrs?.find(attr => attr.name === 'href');
							if (hrefAttr) {
								currentBuilding.directory = hrefAttr.value;
								if (anchor.childNodes && anchor.childNodes.length > 0) {
									const titleTextNode = anchor.childNodes[0] as Text;
									currentBuilding.fullName = String(titleTextNode["value" as keyof Object]).trim();
								}
							}
						}
					} else if (classAttr.value.includes('views-field-field-building-code')) {
						currentBuilding.shortName = node.childNodes?.[0]?.value?.trim() || "";
					} else if (classAttr.value.includes('views-field-field-building-address')) {
						currentBuilding.address = node.childNodes?.[0]?.value?.trim() || "";
					}
				}
			}
			if (node.childNodes) {
				for (const child of node.childNodes) {
					traverseAndExtract(child, currentBuilding);
				}
			}
		};

		const traverseRows = (node: any): void => {
			if (node.tagName === "tr") {
				const currentBuilding: any = {
					fullName: "",
					shortName: "",
					address: "",
					directory: "",
					lat: 0,
					lon: 0
				};

				traverseAndExtract(node, currentBuilding);

				const { fullName, shortName, address, directory } = currentBuilding;
				if (fullName && shortName && address && directory) {
					const building = new Building(fullName, shortName, address, 0, 0, directory);
					buildings.push(building);
				}
			}
			if (node.childNodes) {
				for (const child of node.childNodes) {
					traverseRows(child);
				}
			}
		};

		if (buildingTable.childNodes) {
			for (const child of buildingTable.childNodes) {
				traverseRows(child);
			}
		}

		return buildings;
	}

	private async processRoomsFile(zip: JSZip, buildings: Building[]): Promise<Room[]> {
		let rooms: Room[] = [];
		for (const building of buildings) {
			const filePath = building.getDirectory();
			if (zip.files[filePath] && !zip.files[filePath].dir) {
				try {
					const fileContent = await zip.files[filePath].async("text");
					const parsedHTML = parse(fileContent);
					rooms = rooms.concat(this.extractValidRooms(parsedHTML, building));
				} catch {
					continue;
				}
			}
		}
		return rooms;
	}

	private extractValidRooms(parsedHTML: any, building: Building): Room[] {
		// TODO: finish implementation
		// traverse the roomsTable and along the way validate the data
		// for every valid room, construct a room object and add it to an array
		// return an array of all the valid rooms
		const allTables = this.findAllTables(parsedHTML);
		const roomsTable = this.findMainTable(allTables);
		const rooms: Room[] = [];

		// Helper function to traverse the DOM
		const traverseAndExtract = (node: any, currentRoom: any): any => {
			if (node.tagName === 'td') {
				const classAttr = node.attrs?.find((attr: { name: string }) => attr.name === 'class');
				if (classAttr) {
					if (classAttr.value.includes('views-field-field-room-number')) {
						const anchor = node.childNodes?.find((child: { nodeName: string }) => child.nodeName === 'a') as Element;
						if (anchor) {
							const hrefAttr = anchor.attrs?.find(attr => attr.name === 'href');
							if (hrefAttr) {
								currentRoom.href = hrefAttr.value;
								if (anchor.childNodes && anchor.childNodes.length > 0) {
									const roomNumberTextNode = anchor.childNodes[0] as Text;
									currentRoom.number = String(roomNumberTextNode["value" as keyof Object]).trim();
								}
							}
						}
					} else if (classAttr.value.includes('views-field-field-room-capacity')) {
						currentRoom.seats = Number(node.childNodes?.[0]?.value?.trim() || 0);
					} else if (classAttr.value.includes('views-field-field-room-furniture')) {
						currentRoom.furniture = node.childNodes?.[0]?.value?.trim() || "";
					} else if (classAttr.value.includes('views-field-field-room-type')) {
						currentRoom.type = node.childNodes?.[0]?.value?.trim() || "";
					}
				}
			}
			if (node.childNodes) {
				for (const child of node.childNodes) {
					traverseAndExtract(child, currentRoom);
				}
			}
		};

		const traverseRows = (node: any): void => {
			if (node.tagName === "tr") {
				const currentRoom: any = {
					fullName: building.getFullName(),
					shortName: building.getShortName(),
					number: "",
					name: "",
					address: building.getAddress(),
					lat: 1,
					lon: 1,
					seats: 0,
					type: "",
					furniture: "",
					href: ""
				};

				traverseAndExtract(node, currentRoom);

				const { fullName, shortName, number,
					address, lat, lon, seats, type, furniture, href } = currentRoom;
				if (fullName && shortName && number &&
					address && lat && lon && seats && type && furniture && href) {
					const room = new Room(fullName, shortName, number, shortName+"_"+fullName,
						address, lat, lon, seats, type, furniture, href);
					rooms.push(room);
				}
			}
			if (node.childNodes) {
				for (const child of node.childNodes) {
					traverseRows(child);
				}
			}
		};

		if (roomsTable.childNodes) {
			for (const child of roomsTable.childNodes) {
				traverseRows(child);
			}
		}

		return rooms;
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
