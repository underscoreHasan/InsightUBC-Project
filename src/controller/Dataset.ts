import Section from "./Section";

export default class Dataset {
	private datasetID: string;
	private sections: Section[] = [];

	constructor(datasetID: string) {
		this.datasetID = datasetID;
	}

	public setDatasetID(datasetID: string) {
		this.datasetID = datasetID;
	}

	public addSection(section: Section) {
		this.sections.push(section);
	}

	public getDatasetID() {
		return this.datasetID;
	}

	public getSections() {
		return this.sections;
	}
}
