import path from "path";
import fs from "fs-extra";
import Dataset from "./Dataset";
import { InsightDatasetKind, InsightError } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
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
		const dataset = await fs.readJson(filePath);
		const newDataset = new Dataset(datasetID, dataset.kind);

		if (dataset.kind === InsightDatasetKind.Sections) {
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
		}

		if (dataset.kind === InsightDatasetKind.Rooms) {
			const rooms: Room[] = dataset.rooms.map(
				(room: any) =>
					new Room(
						room.fullName,
						room.shortName,
						room.number,
						room.name,
						room.address,
						room.lat,
						room.lon,
						room.seats,
						room.type,
						room.furniture,
						room.href
					)
			);

			rooms.forEach((room) => {
				newDataset.addRoom(room);
			});
		}

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

		if (dataset.kind === InsightDatasetKind.Sections) {
			return dataset.sections.map(
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
		} else {
			return dataset.rooms.map(
				(room: any) =>
					new Room(
						room.fullName,
						room.shortName,
						room.number,
						room.name,
						room.address,
						room.lat,
						room.lon,
						room.seats,
						room.type,
						room.furniture,
						room.href
					)
			);
		}
	} catch (error) {
		throw new InsightError(`Error loading dataset from disk: ${error}`);
	}
}

export async function saveDatasetToDisk(dataset: Dataset, id: string, kind: InsightDatasetKind): Promise<void> {
	const dirPath = DATA_DIR; // Use the directory path defined earlier
	const filePath = path.join(dirPath, `${id}.json`);

	// Check if the data directory exists; if not, create it
	await fs.ensureDir(dirPath); // This will create the directory if it does not exist
	let dataToSave;
	if (kind === InsightDatasetKind.Sections) {
		dataToSave = {
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
			})),
			kind: dataset.getKind(), // Ensure only serializable properties are included
		};
	} else {
		dataToSave = {
			datasetID: dataset.getDatasetID(),
			rooms: dataset.getRooms().map((room) => ({
				fullName: String(room.getFullName()),
				shortname: String(room.getShortName()),
				number: String(room.getNumber()),
				name: String(room.getName()),
				address: String(room.getAddress()),
				lat: Number(room.getLat()),
				lon: Number(room.getLat()),
				seats: Number(room.getSeats()),
				type: String(room.getType()),
				furniture: String(room.getFurniture()),
				href: String(room.getHref()),
			})),
			kind: dataset.getKind(), // Ensure only serializable properties are included
		};
	}

	try {
		await fs.writeJson(filePath, dataToSave);
	} catch {
		throw new InsightError("writeJSON failed!");
	}
}
