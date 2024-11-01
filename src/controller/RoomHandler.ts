import JSZip from "jszip";
import Room from "./Room";
import Building from "./Building";
import { InsightError } from "./IInsightFacade";
import { parse } from "parse5";
import { Document, Element } from "parse5/dist/tree-adapters/default";
import { GeolocationService } from "./HttpClient"; // Import the GeolocationService

export class RoomHandler {
	private geolocationService: GeolocationService;

	constructor() {
		this.geolocationService = new GeolocationService();
	}

	public async extractRooms(zip: JSZip): Promise<Room[]> {
		let indexContent: string;
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
			throw new InsightError("Error accessing ./campus/discover/buildings-and-classrooms directory");
		}
		const buildings = await this.extractBuildings(indexContent);
		const roomResults = await this.processRoomsFile(zip, buildings);

		if (roomResults.flat().length === 0) {
			throw new InsightError("No valid rooms");
		} else {
			return roomResults.flat();
		}
	}

	private findAllTables(parsedHTML: Document): Document[] {
		const tables: Document[] = [];
		function recursiveSearch(node: Document): void {
			if (node.nodeName.toString() === "table") {
				tables.push(node);
			}
			if ("childNodes" in node) {
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
		if (
			node.tagName === "td" &&
			node.attrs?.some((attr) => attr.name === "class" && attr.value.includes("views-field"))
		) {
			return true;
		}
		if (node.childNodes) {
			for (const child of node.childNodes) {
				if (this.containsViewsTableClass(child as any as Element)) {
					return true;
				}
			}
		}
		return false;
	}

	private async extractBuildings(indexContent: string): Promise<Building[]> {
		let parsedHTML: Document;
		try {
			parsedHTML = parse(indexContent);
		} catch {
			throw new InsightError("Error parsing HTML content");
		}
		const allTables = this.findAllTables(parsedHTML);
		const buildingTable = this.findMainTable(allTables);
		if (buildingTable === null) {
			throw new InsightError("No building table was found in index.htm");
		}
		return await this.processBuildingTable(buildingTable);
	}

	private async processBuildingTable(buildingTable: Document): Promise<Building[]> {
		const buildings: Building[] = [];
		if (buildingTable.childNodes) {
			await Promise.all(
				buildingTable.childNodes.map(async (child: any) => {
					await this.traverseBuildingRows(child, buildings);
				})
			);
		}
		return buildings;
	}

	private async traverseBuildingRows(node: any, buildings: Building[]): Promise<void> {
		if (node.tagName === "tr") {
			const currentBuilding: any = this.initializeEmptyBuilding();
			await this.traverseAndExtractBuildingAttributes(node, currentBuilding);
			await this.addBuildingIfValid(currentBuilding, buildings);
		}
		if (node.childNodes) {
			await Promise.all(
				node.childNodes.map(async (child: any) => {
					await this.traverseBuildingRows(child, buildings);
				})
			);
		}
	}

	private async traverseAndExtractBuildingAttributes(node: any, currentBuilding: any): Promise<void> {
		if (node.tagName === "td") {
			this.extractBuildingAttributes(node, currentBuilding);
		}
		if (node.childNodes) {
			await Promise.all(
				node.childNodes.map(async (child: any) => {
					await this.traverseAndExtractBuildingAttributes(child, currentBuilding);
				})
			);
		}
	}

	private extractBuildingAttributes(node: any, currentBuilding: any): void {
		const classAttr = node.attrs?.find((attr: { name: string }) => attr.name === "class");
		if (classAttr) {
			if (classAttr.value.includes("views-field-title")) {
				const anchor = node.childNodes?.find((child: { nodeName: string }) => child.nodeName === "a") as Element;
				if (anchor) {
					const hrefAttr = anchor.attrs?.find((attr) => attr.name === "href");
					if (hrefAttr) {
						currentBuilding.directory = hrefAttr.value;
						if (anchor.childNodes && anchor.childNodes.length > 0) {
							const titleTextNode = anchor.childNodes[0] as Text;
							currentBuilding.fullName = String(titleTextNode["value" as keyof Object]).trim();
						}
					}
				}
			} else if (classAttr.value.includes("views-field-field-building-code")) {
				currentBuilding.shortName = node.childNodes?.[0]?.value?.trim() || "";
			} else if (classAttr.value.includes("views-field-field-building-address")) {
				currentBuilding.address = node.childNodes?.[0]?.value?.trim() || "";
			}
		}
	}

	private initializeEmptyBuilding(): any {
		return {
			fullName: "",
			shortName: "",
			address: "",
			directory: "",
			lat: 0,
			lon: 0,
		};
	}

	private async addBuildingIfValid(currentBuilding: any, buildings: Building[]): Promise<void> {
		const { fullName, shortName, address, directory } = currentBuilding;
		if (fullName && shortName && address && directory) {
			const { lat, lon } = await this.geolocationService.makeGeolocationRequest(address); // Use the GeolocationService
			currentBuilding.lat = lat;
			currentBuilding.lon = lon;
			const building = new Building(fullName, shortName, address, lat, lon, directory);
			buildings.push(building);
		}
	}

	private async processRoomsFile(zip: JSZip, buildings: Building[]): Promise<Room[]> {
		const promises: Promise<Room[]>[] = buildings.map(async (building) => {
			const filePath = building.getDirectory();
			if (zip.files[filePath] && !zip.files[filePath].dir) {
				try {
					const fileContent = await zip.files[filePath].async("text");
					const parsedHTML = parse(fileContent);
					return this.extractValidRooms(parsedHTML, building);
				} catch {
					return [];
				}
			}
			return [];
		});

		const roomsArrays = await Promise.all(promises);
		return roomsArrays.flat();
	}

	private extractValidRooms(parsedHTML: Document, building: Building): Room[] {
		const allTables = this.findAllTables(parsedHTML);
		const roomsTable = this.findMainTable(allTables);
		const rooms: Room[] = [];
		if (roomsTable.childNodes) {
			void this.traverseRows(roomsTable.childNodes, building, rooms);
		}
		return rooms;
	}

	private async traverseRows(nodes: any[], building: Building, rooms: Room[]): Promise<void> {
		await Promise.all(
			nodes.map(async (node: any) => {
				if (node.tagName === "tr") {
					const currentRoom = this.initializeRoom(building);
					this.traverseAndExtract(node, currentRoom);
					if (this.isRoomValid(currentRoom)) {
						const room = this.constructRoom(currentRoom);
						rooms.push(room);
					}
				}
				if (node.childNodes) {
					await this.traverseRows(node.childNodes, building, rooms);
				}
			})
		);
	}

	private traverseAndExtract(node: any, currentRoom: any): void {
		if (node.tagName === "td") {
			const classAttr = node.attrs?.find((attr: { name: string }) => attr.name === "class");
			if (classAttr) {
				this.extractRoomAttributes(node, classAttr.value, currentRoom);
			}
		}
		if (node.childNodes) {
			node.childNodes.forEach((child: any) => {
				this.traverseAndExtract(child, currentRoom);
			});
		}
	}

	private extractRoomAttributes(node: any, classAttrValue: string, currentRoom: any): void {
		if (classAttrValue.includes("views-field-field-room-number")) {
			const anchor = node.childNodes?.find((child: { nodeName: string }) => child.nodeName === "a") as Element;
			if (anchor) {
				const hrefAttr = anchor.attrs?.find((attr) => attr.name === "href");
				if (hrefAttr) {
					currentRoom.href = hrefAttr.value;
					if (anchor.childNodes && anchor.childNodes.length > 0) {
						const roomNumberTextNode = anchor.childNodes[0] as Text;
						currentRoom.number = String(roomNumberTextNode["value" as keyof Object]).trim();
					}
				}
			}
		} else if (classAttrValue.includes("views-field-field-room-capacity")) {
			currentRoom.seats = Number(node.childNodes?.[0]?.value?.trim() || 0);
		} else if (classAttrValue.includes("views-field-field-room-furniture")) {
			currentRoom.furniture = node.childNodes?.[0]?.value?.trim() || "";
		} else if (classAttrValue.includes("views-field-field-room-type")) {
			currentRoom.type = node.childNodes?.[0]?.value?.trim() || "";
		}
	}

	private initializeRoom(building: Building): any {
		return {
			fullName: building.getFullName(),
			shortName: building.getShortName(),
			number: "",
			name: "",
			address: building.getAddress(),
			lat: building.getLat(),
			lon: building.getLon(),
			seats: 0,
			type: "",
			furniture: "",
			href: "",
		};
	}

	private isRoomValid(room: any): boolean {
		const { fullName, shortName, number, address, lat, lon, seats, type, furniture, href } = room;
		return !!(fullName && shortName && number && address && lat && lon && seats && type && furniture && href);
	}

	private constructRoom(room: any): Room {
		const { fullName, shortName, number, address, lat, lon, seats, type, furniture, href } = room;
		return new Room(
			fullName,
			shortName,
			number,
			shortName + "_" + number,
			address,
			lat,
			lon,
			seats,
			type,
			furniture,
			href
		);
	}
}
