import JSZip from "jszip";
import Dataset from "./Dataset";
import { InsightDatasetKind, InsightError, NotFoundError } from "./IInsightFacade";
import { SectionHandler } from "./SectionHandler";
import Section from "./Section";
import Room from "./Room";
import { RoomHandler } from "./RoomHandler";

export class DatasetHandler {
	private datasetIDs: string[] = [];
	private datasets: Dataset[] = [];
	private sectionHandler: SectionHandler = new SectionHandler();
	private roomHandler: RoomHandler = new RoomHandler();

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
		const trim = id.trim().length !== 0;
		const includes = !this.datasetIDs.includes(id);
		return rgx && trim && includes;
	}

	public async loadZip(content: string): Promise<JSZip> {
		try {
			return await JSZip.loadAsync(content, { base64: true });
		} catch (err) {
			throw new InsightError(
				"JSZip threw error: " + (err instanceof Error ? err.message : "An unknown error occurred.")
			);
		}
	}

	public async processZip(id: string, zip: JSZip, kind: InsightDatasetKind): Promise<void> {
		if (kind === InsightDatasetKind.Sections) {
			const validSections = await this.sectionHandler.extractSections(zip);
			if (validSections.length === 0) {
				throw new InsightError("no valid sections");
			}
			this.addSectionsDatasetToMemory(id, validSections);
		} else if (kind === InsightDatasetKind.Rooms) {
			const validRooms = await this.roomHandler.extractRooms(zip);

			// for (const room of validRooms) {
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
			// console.log(validRooms.length);

			if (validRooms.length === 0) {
				throw new InsightError("no valid rooms");
			}
			this.addRoomsDatasetToMemory(id, validRooms);
		} else {
			throw new InsightError("Invalid kind!");
		}
	}

	private addSectionsDatasetToMemory(id: string, sections: Section[]): Dataset {
		const currentDataset = new Dataset(id, InsightDatasetKind.Sections);
		for (const section of sections) {
			currentDataset.addSection(section);
		}
		this.datasetIDs.push(id);
		this.datasets.push(currentDataset);
		return currentDataset;
	}

	private addRoomsDatasetToMemory(id: string, rooms: Room[]): Dataset {
		const currentDataset = new Dataset(id, InsightDatasetKind.Rooms);
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
