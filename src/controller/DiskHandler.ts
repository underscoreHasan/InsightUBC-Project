import path from "path";
import fs from "fs-extra";
import Dataset from "./Dataset";
import { InsightError } from "./IInsightFacade";
import Section from "./Section";
import { DATA_DIR } from "./InsightFacade";

async function getDiskIDs(): Promise<any> {
	const result: string[] = [];
	await fs.ensureDir(DATA_DIR);
	const files = await fs.readdir(DATA_DIR);
	files.forEach((file: string) => {
		const truncated = file.substring(0, file.lastIndexOf("."));
		result.push(truncated);
	});
	return result;
}

export async function addCacheToMemory(memory: Dataset[], memoryIds: string[]): Promise<void> {
	const ids = await getDiskIDs();
	const datasetPromises = ids.map(async (datasetID: string) => {
		const filePath = path.join(DATA_DIR, `${datasetID}.json`);
		const newDataset = new Dataset(datasetID);

		const dataset = await fs.readJson(filePath);

		const sections: Section[] = dataset.sections.map(
			(section: any) =>
				new Section(
					section.uuid,
					section.id,
					section.title,
					section.instructor,
					section.dept,
					section.year,
					section.avg,
					section.pass,
					section.fail,
					section.audit
				)
		);

		sections.forEach((section) => {
			newDataset.addSection(section);
		});
		if (!memoryIds.includes(datasetID)) {
			memoryIds.push(datasetID);
			memory.push(newDataset);
		}
	});

	await Promise.all(datasetPromises);
}

export async function loadDatasetFromDisk(this: any, id: string): Promise<Section[]> {
	const filePath = path.join(DATA_DIR, `${id}.json`);

	try {
		const dataset = await fs.readJson(filePath); // Read the dataset JSON file

		const sections: Section[] = dataset.sections.map(
			(section: any) =>
				new Section(
					section.uuid,
					section.id,
					section.title,
					section.instructor,
					section.dept,
					section.year,
					section.avg,
					section.pass,
					section.fail,
					section.audit
				)
		);

		return sections;
	} catch (error) {
		throw new InsightError(`Error loading dataset from disk: ${error}`);
	}
}

export async function saveDatasetToDisk(dataset: Dataset, id: string): Promise<void> {
	const dirPath = DATA_DIR; // Use the directory path defined earlier
	const filePath = path.join(dirPath, `${id}.json`);

	// Check if the data directory exists; if not, create it
	await fs.ensureDir(dirPath); // This will create the directory if it does not exist
	const dataToSave = {
		datasetID: dataset.getDatasetID(),
		sections: dataset.getSections().map((section) => ({
			uuid: String(section.getUuid()),
			id: section.getId(),
			title: section.getTitle(),
			instructor: section.getInstructor(),
			dept: section.getDept(),
			year: Number(section.getYear()),
			avg: section.getAvg(),
			pass: section.getPass(),
			fail: section.getFail(),
			audit: section.getAudit(),
		})), // Ensure only serializable properties are included
	};
	try {
		await fs.writeJson(filePath, dataToSave);
	} catch {
		throw new InsightError("writeJSON failed!");
	}
}
