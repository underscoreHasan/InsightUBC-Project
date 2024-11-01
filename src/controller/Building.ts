export default class Building {
	private readonly fullName: string;
	private readonly shortName: string;
	private readonly address: string;
	private lat: number;
	private lon: number;
	private readonly directory: string;

	constructor(fullName: string, shortName: string, address: string, lat: number, lon: number, directory: string) {
		this.fullName = fullName;
		this.shortName = shortName;
		this.address = address;
		this.lat = lat;
		this.lon = lon;
		this.directory = directory.slice(directory.indexOf("/") + 1);
	}

	public getFullName(): string {
		return this.fullName;
	}

	public getShortName(): string {
		return this.shortName;
	}

	public getAddress(): string {
		return this.address;
	}

	public getLat(): number {
		return this.lat;
	}

	public getLon(): number {
		return this.lon;
	}

	public getDirectory(): string {
		return this.directory;
	}

	public setLat(lat: number): void {
		this.lat = lat;
	}

	public setLon(lon: number): void {
		this.lon = lon;
	}
}
