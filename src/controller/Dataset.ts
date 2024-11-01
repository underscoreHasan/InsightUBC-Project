import Section from "./Section";
import Room from "./Room";
import { InsightDatasetKind } from "./IInsightFacade";

export default class Dataset {
	private datasetID: string;
	private sections: Section[] = [];
	private rooms: Room[] = [];
	private kind: InsightDatasetKind;

	constructor(datasetID: string, datasetKind: InsightDatasetKind) {
		this.datasetID = datasetID;
		this.kind = datasetKind;
	}

	public setDatasetID(datasetID: string): void {
		this.datasetID = datasetID;
	}

	public setDatasetKind(datasetKind: InsightDatasetKind): void {
		this.kind = datasetKind;
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

	public getRooms(): Room[] {
		return this.rooms;
	}

	public getKind(): InsightDatasetKind {
		return this.kind;
	}
}
