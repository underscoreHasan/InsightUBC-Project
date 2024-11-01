import http from "http";
import { InsightError } from "./IInsightFacade";

export class HttpClient {
	public async httpRequest(url: string): Promise<string> {
		return new Promise((resolve, reject) => {
			http.get(url, (response) => {
				let data = "";
				response.on("data", (chunk) => {
					data += chunk;
				});
				response.on("end", () => {
					resolve(data);
				});
				response.on("error", (err) => {
					reject(err);
				});
			});
		});
	}
}

export class GeolocationService {
	private httpClient: HttpClient;

	constructor() {
		this.httpClient = new HttpClient();
	}

	public async makeGeolocationRequest(address: string): Promise<{ lat: number; lon: number }> {
		const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team086/${encodeURIComponent(address)}`;
		const response = await this.httpClient.httpRequest(url);
		const data = JSON.parse(response);
		if (data.error) {
			throw new InsightError(`Error fetching geolocation for address: ${address}`);
		}
		return { lat: data.lat, lon: data.lon };
	}
}
