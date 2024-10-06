import Section from "./Section";

export default class Dataset {
	private datasetID: string;
	private sections: Section[] = [];

	constructor(datasetID: string) {
		this.datasetID = datasetID;
	}

	public setDatasetID(datasetID: string): void {
		this.datasetID = datasetID;
	}

	public addSection(section: Section): void {
		this.sections.push(section);
	}

	public getDatasetID(): string {
		return this.datasetID;
	}

	public getSections(): Section[] {
		return this.sections;
	}
}
