import Section from "./Section";
import Room from "./Room";

export default class Dataset {
	private datasetID: string;
	private sections: Section[] = [];
	private rooms: Room[] = [];

	constructor(datasetID: string) {
		this.datasetID = datasetID;
	}

	public setDatasetID(datasetID: string): void {
		this.datasetID = datasetID;
	}

	public addSection(section: Section): void {
		this.sections.push(section);
	}

	public addRoom(room: Room): void {
		this.rooms.push(room);
	}

	public getDatasetID(): string {
		return this.datasetID;
	}

	public getSections(): Section[] {
		return this.sections;
	}

	public getRooms(): Section[] {
		return this.sections;
	}
}
