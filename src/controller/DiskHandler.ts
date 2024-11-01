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
	const datasetPromises = ids.map(async (datasetID: string) => processDataset(datasetID, memory, memoryIds));
	await Promise.all(datasetPromises);
}

async function processDataset(datasetID: string, memory: Dataset[], memoryIds: string[]): Promise<void> {
	const filePath = path.join(DATA_DIR, `${datasetID}.json`);
	const dataset = await fs.readJson(filePath);
	const newDataset = new Dataset(datasetID, dataset.kind);

	if (dataset.kind === InsightDatasetKind.Sections) {
		const sections = createSections(dataset.sections);
		sections.forEach((section) => newDataset.addSection(section));
	}

	if (dataset.kind === InsightDatasetKind.Rooms) {
		const rooms = createRooms(dataset.rooms);
		rooms.forEach((room) => newDataset.addRoom(room));
	}

	if (!memoryIds.includes(datasetID)) {
		memoryIds.push(datasetID);
		memory.push(newDataset);
	}
}

function createSections(sectionsData: any[]): Section[] {
	return sectionsData.map(
		(sectionData) =>
			new Section(
				sectionData.uuid,
				sectionData.id,
				sectionData.title,
				sectionData.instructor,
				sectionData.dept,
				sectionData.year,
				sectionData.avg,
				sectionData.pass,
				sectionData.fail,
				sectionData.audit
			)
	);
}

function createRooms(roomsData: any[]): Room[] {
	return roomsData.map(
		(roomData) =>
			new Room(
				roomData.fullName,
				roomData.shortName,
				roomData.number,
				roomData.name,
				roomData.address,
				roomData.lat,
				roomData.lon,
				roomData.seats,
				roomData.type,
				roomData.furniture,
				roomData.href
			)
	);
}
async function loadJsonFile(filePath: string): Promise<any> {
	try {
		return await fs.readJson(filePath);
	} catch (error) {
		throw new InsightError(`Error loading dataset from disk: ${error}`);
	}
}

function mapSection(section: any): Section {
	return new Section(
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
	);
}

function mapRoom(room: any): Room {
	return new Room(
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
	);
}

export async function loadDatasetFromDisk(id: string): Promise<Section[]> {
	const filePath = path.join(DATA_DIR, `${id}.json`);
	const dataset = await loadJsonFile(filePath);

	return dataset.kind === InsightDatasetKind.Sections ? dataset.sections.map(mapSection) : dataset.rooms.map(mapRoom);
}

function serializeSection(section: any): any {
	return {
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
	};
}

function serializeRoom(room: any): any {
	return {
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
	};
}

export async function saveDatasetToDisk(dataset: Dataset, id: string, kind: InsightDatasetKind): Promise<void> {
	const dirPath = DATA_DIR;
	const filePath = path.join(dirPath, `${id}.json`);

	await fs.ensureDir(dirPath);

	const dataToSave =
		kind === InsightDatasetKind.Sections
			? {
					datasetID: dataset.getDatasetID(),
					sections: dataset.getSections().map(serializeSection),
					kind: dataset.getKind(),
			  }
			: {
					datasetID: dataset.getDatasetID(),
					rooms: dataset.getRooms().map(serializeRoom),
					kind: dataset.getKind(),
			  };

	try {
		await fs.writeJson(filePath, dataToSave);
	} catch {
		throw new InsightError("writeJSON failed!");
	}
}
